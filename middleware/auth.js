const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to verify JWT token
exports.verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token error' });
    }
    
    const [scheme, token] = parts;
    
    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token malformatted' });
    }
    
    try {
        const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
        req.userId = decoded.id;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
