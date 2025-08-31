// src/utils/AppError.js
/**
 * 自定义错误类，用于在Service层和Controller层之间传递业务错误
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

module.exports = AppError;