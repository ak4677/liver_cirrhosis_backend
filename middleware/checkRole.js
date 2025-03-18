// checkRole.js
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // 1. Get user's role from JWT
        const userRole = req.user?.role; // From authenticated user object
        
        // 2. Check if user has permission
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: "Forbidden: Insufficient permissions"
            });
        }

        // 3. Grant access if role matches
        next();
    };
};

module.exports = checkRole;