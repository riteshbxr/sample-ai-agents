/**
 * Input Validator
 * Validates user input according to configurable rules
 */
export class InputValidator {
  static validate(input, options = {}) {
    const {
      maxLength = 10000,
      minLength = 1,
      allowedChars = null,
      blockUrls = true,
      blockEmails = false,
    } = options;

    const errors = [];

    // Length validation
    if (input.length < minLength) {
      errors.push('Input too short');
    }
    if (input.length > maxLength) {
      errors.push('Input too long');
    }

    // URL blocking
    if (blockUrls && /https?:\/\//.test(input)) {
      errors.push('URLs not allowed');
    }

    // Email blocking
    if (blockEmails && /[\w.-]+@[\w.-]+\.\w+/.test(input)) {
      errors.push('Email addresses not allowed');
    }

    // Character validation
    if (allowedChars && !new RegExp(`^[${allowedChars}]+$`).test(input)) {
      errors.push('Invalid characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
