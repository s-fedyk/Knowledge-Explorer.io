# app/utils/logging_decorator.py
import logging
import functools
import time
import json
from typing import Any, Callable, Dict
import inspect
import traceback

logger = logging.getLogger(__name__)


def log_db_operation(func: Callable) -> Callable:
    """Decorator to log database operations with parameters and results"""

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        # Get the function name and qualified name (includes class)
        func_name = func.__name__
        qual_name = func.__qualname__

        # Get caller information
        frame = inspect.currentframe().f_back
        caller_info = f"{frame.f_code.co_filename}:{frame.f_lineno}"

        # Identify self parameter for class methods
        instance_name = None
        if args and len(args) > 0 and hasattr(args[0], '__class__'):
            instance_name = args[0].__class__.__name__

        # Prepare parameters for logging (excluding self)
        params = {}
        if instance_name:
            # Skip 'self' for instance methods
            sig = inspect.signature(func)
            param_names = list(sig.parameters.keys())[1:]  # Skip 'self'
            for i, param_name in enumerate(param_names):
                if i < len(args) - 1:  # -1 because we skipped 'self'
                    params[param_name] = _safe_repr(args[i + 1])
        else:
            # For static methods or functions
            sig = inspect.signature(func)
            param_names = list(sig.parameters.keys())
            for i, param_name in enumerate(param_names):
                if i < len(args):
                    params[param_name] = _safe_repr(args[i])

        # Add keyword arguments
        for key, value in kwargs.items():
            params[key] = _safe_repr(value)

        # Log the operation start
        operation_id = str(time.time())
        start_time = time.time()

        try:
            # Log the beginning of the operation
            logger.info(
                f"DB_OP_START id={operation_id} op={qual_name} "
                f"params={_safe_json(params)} caller={caller_info}"
            )

            # Execute the function
            result = await func(*args, **kwargs)

            # Calculate execution time
            execution_time = time.time() - start_time

            # Log the successful completion
            logger.info(
                f"DB_OP_SUCCESS id={operation_id} op={qual_name} "
                f"time={execution_time:.4f}s result={_safe_repr(result)}"
            )

            return result

        except Exception as e:
            # Calculate execution time
            execution_time = time.time() - start_time

            # Log the error
            logger.error(
                f"DB_OP_ERROR id={operation_id} op={qual_name} "
                f"time={execution_time:.4f}s error={str(e)} "
                f"traceback={traceback.format_exc()}"
            )

            # Re-raise the exception
            raise

    return wrapper


def _safe_repr(obj: Any) -> str:
    """Convert an object to a safe string representation for logging"""
    try:
        if hasattr(obj, 'dict') and callable(obj.dict):
            # For Pydantic models
            return str(obj.dict())
        elif isinstance(obj, (dict, list, str, int, float, bool, type(None))):
            # For JSON-serializable types
            return str(obj)
        else:
            # For other objects
            return f"{type(obj).__name__}(id={id(obj)})"
    except Exception:
        return f"<unrepresentable-{type(obj).__name__}>"


def _safe_json(obj: Dict) -> str:
    """Safely convert a dictionary to a JSON string for logging"""
    try:
        return json.dumps(obj, default=lambda o: _safe_repr(o))
    except Exception:
        return str(obj)
