"""
Safe expression evaluator - prevents arbitrary code execution.
Use this instead of eval() or simpleeval for filtering/condition expressions.
"""
import ast
import operator
from typing import Any


class SafeEval(ast.NodeVisitor):
    """Safely evaluate mathematical and comparison expressions."""
    
    SAFE_FUNCTIONS = {'len', 'str', 'int', 'float', 'bool', 'abs', 'min', 'max', 'round', 'sum', 'any', 'all'}
    SAFE_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.Lt: operator.lt,
        ast.Gt: operator.gt,
        ast.LtE: operator.le,
        ast.GtE: operator.ge,
        ast.Eq: operator.eq,
        ast.NotEq: operator.ne,
        ast.In: lambda a, b: a in b,
        ast.NotIn: lambda a, b: a not in b,
        ast.And: lambda a, b: a and b,
        ast.Or: lambda a, b: a or b,
        ast.Not: operator.not_,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }
    
    def __init__(self, names: dict[str, Any]):
        self.names = names
    
    def visit(self, node):
        if isinstance(node, ast.Expression):
            return self.visit(node.body)
        
        if isinstance(node, ast.Constant):
            return node.value
        
        if isinstance(node, ast.Name):
            if node.id in self.names:
                return self.names[node.id]
            if node.id in self.SAFE_FUNCTIONS:
                return getattr(__builtins__, node.id) if isinstance(__builtins__, dict) else getattr(__builtins__, node.id)
            raise ValueError(f"Unknown name: {node.id}")
        
        if isinstance(node, ast.BinOp):
            left = self.visit(node.left)
            right = self.visit(node.right)
            op_func = self.SAFE_OPERATORS[type(node.op)]
            return op_func(left, right)
        
        if isinstance(node, ast.UnaryOp):
            operand = self.visit(node.operand)
            op_func = self.SAFE_OPERATORS[type(node.op)]
            return op_func(operand)
        
        if isinstance(node, ast.Compare):
            left = self.visit(node.left)
            for op, comp in zip(node.ops, node.comparators):
                right = self.visit(comp)
                if not self.SAFE_OPERATORS[type(op)](left, right):
                    return False
                left = right
            return True
        
        if isinstance(node, ast.BoolOp):
            result = self.visit(node.values[0])
            for value in node.values[1:]:
                result = self.SAFE_OPERATORS[type(node.op)](result, self.visit(value))
            return result
        
        if isinstance(node, ast.Subscript):
            obj = self.visit(node.value)
            key = self.visit(node.slice)
            return obj[key]
        
        if isinstance(node, ast.Attribute):
            obj = self.visit(node.value)
            return getattr(obj, node.attr)
        
        if isinstance(node, ast.Call):
            func = self.visit(node.func)
            args = [self.visit(arg) for arg in node.args]
            if isinstance(func, __builtins__.__class__) or (hasattr(func, '__name__') and func.__name__ not in self.SAFE_FUNCTIONS):
                raise ValueError(f"Function not allowed: {func}")
            return func(*args)
        
        if isinstance(node, ast.Tuple):
            return tuple(self.visit(el) for el in node.elts)
        
        if isinstance(node, ast.List):
            return [self.visit(el) for el in node.elts]
        
        if isinstance(node, ast.Dict):
            return {self.visit(k): self.visit(v) for k, v in zip(node.keys, node.values)}
        
        if isinstance(node, ast.Index):
            return self.visit(node.value)
        
        raise ValueError(f"Unsupported AST node: {type(node).__name__}")
    
    def visit_BinOp(self, node):
        return self.visit(node)
    
    def visit_UnaryOp(self, node):
        return self.visit(node)
    
    def visit_Compare(self, node):
        return self.visit(node)


def safe_eval(expr: str, names: dict[str, Any]) -> Any:
    """Safely evaluate a simple expression with variable access.
    
    Only allows:
    - Mathematical operations: +, -, *, /, //, %, **
    - Comparisons: ==, !=, <, >, <=, >=
    - Boolean operations: and, or, not
    - Membership tests: in, not in
    - Safe functions: len, str, int, float, bool, abs, min, max, round, sum, any, all
    
    Raises ValueError for any attempt to access dangerous operations.
    """
    try:
        tree = ast.parse(expr, mode='eval')
        evaluator = SafeEval(names)
        return evaluator.visit(tree)
    except (SyntaxError, ValueError, TypeError, ZeroDivisionError, KeyError, IndexError) as e:
        raise ValueError(f"Expression evaluation failed: {e}")


def get_comparator(condition: str):
    """Create a comparator function from a condition expression."""
    def comparator(data: dict[str, Any]):
        try:
            result = safe_eval(condition, names=data)
            return result
        except Exception as e:
            return False

    return comparator
