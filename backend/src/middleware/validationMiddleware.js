export const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      const formattedErrors = err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid request data provided.',
        details: formattedErrors
      });
    }
  };
};
