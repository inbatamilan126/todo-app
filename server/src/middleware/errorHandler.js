export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Always log the full error for debugging
  console.error('Error:', isProduction ? err.message : err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      ...(isProduction 
        ? { message: 'Invalid request data' } 
        : { details: err.errors }
      ),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict',
      message: isProduction 
        ? 'A record with this value already exists' 
        : err.message,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Not found',
      message: isProduction 
        ? 'Record not found' 
        : err.message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: isProduction 
        ? 'Invalid token' 
        : err.message,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token has expired',
    });
  }

  // Default error response
  const status = err.status || 500;
  res.status(status).json({
    error: isProduction ? 'Internal server error' : err.name,
    message: isProduction 
      ? 'An unexpected error occurred' 
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default { errorHandler };
