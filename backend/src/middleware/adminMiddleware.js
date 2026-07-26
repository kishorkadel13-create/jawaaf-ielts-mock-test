export const adminMiddleware = (req, res, next) => {
  const teacherAllowedPrefixes = [
    '/lesson-questions',
  ];
  const isTeacherAllowedRoute = req.user?.role === 'teacher'
    && teacherAllowedPrefixes.some(prefix => req.path.startsWith(prefix));

  if (!req.user || (req.user.role !== 'admin' && !isTeacherAllowedRoute)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access restricted. Administrator or teacher privileges required.'
    });
  }
  next();
};
