// Created By Eyder Ascuntar Rosales
// Mail: eyder.ascuntar@runcode.co
// Company: Runcode Ingeniería SAS
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const customValidator = require('../utils/validators/validator');
const ApiError = require('../dto/commons/response/apiErrorDTO');
const ServiceException = require('../utils/errors/serviceException');
const commonErrors = require('../utils/constants/commonErrors');
const accessControlMessages = require('../utils/constants/accessControlMessages');
const constants = require('../utils/constants/constants');
const User = require('../models/userModel');
const Rol = require('../models/rolModel');
const sendEmail = require('./../utils/email');
const httpCodes = require('../utils/constants/httpCodes');

// =========== Function to Sing and Generate JWT Token
const signToken = (user, roles) => {
  return jwt.sign(
    { id: user._id, authorities: roles, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN
    },
    { algorithm: 'RS256' }
  );
};

// =========== Function to clean specific data of user before return
const cleandUser = user => {
  user.name = undefined;
  user.email = undefined;
  user.photo = undefined;
  user.authorities = undefined;
  user.password = undefined;
  user.passwordConfirm = undefined;
  user.passwordChangedAt = undefined;
  user.active = undefined;
  user.__v = undefined;
  return user;
};

// =========== Function to Protect Path with a valid JWT Token
exports.protectPath = async (req, res) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_02}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_02}`,
        'E_ACCESS_CONTROL_MS_02',
        httpCodes.UNAUTHORIZED
      )
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (decoded) {
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new ServiceException(
        commonErrors.E_COMMON_01,
        new ApiError(
          `${accessControlMessages.E_ACCESS_CONTROL_MS_03}`,
          `${accessControlMessages.E_ACCESS_CONTROL_MS_03}`,
          'E_ACCESS_CONTROL_MS_03',
          httpCodes.NOT_FOUND
        )
      );
    }
    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      throw new ServiceException(
        commonErrors.E_COMMON_01,
        new ApiError(
          `${accessControlMessages.E_ACCESS_CONTROL_MS_04}`,
          `${accessControlMessages.E_ACCESS_CONTROL_MS_04}`,
          'E_ACCESS_CONTROL_MS_04'
        )
      );
    }
  }
};

// =========== Function to Protect Path with a valid JWT Token and Role Specific
exports.protectPathWithRoles = async (req, res, roles) => {
  // 5) Check if user have needed roles to perform this operation
  if (roles.length > 0) {
    // 1) Getting token and check of it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      throw new ServiceException(
        commonErrors.E_COMMON_01,
        new ApiError(
          `${accessControlMessages.E_ACCESS_CONTROL_MS_02}`,
          `${accessControlMessages.E_ACCESS_CONTROL_MS_02}`,
          'E_ACCESS_CONTROL_MS_02',
          httpCodes.UNAUTHORIZED
        )
      );
    }
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    let authorized = false;
    decoded.authorities.forEach(authority => {
      if (roles.includes(authority)) {
        authorized = true;
      }
    });
    if (!authorized) {
      throw new ServiceException(
        commonErrors.E_COMMON_01,
        new ApiError(
          `${accessControlMessages.E_ACCESS_CONTROL_MS_05}`,
          `${accessControlMessages.E_ACCESS_CONTROL_MS_05}`,
          'E_ACCESS_CONTROL_MS_02',
          httpCodes.FORBIDDEN
        )
      );
    }
  }
};

// =========== Function to register a new user
exports.singUp = async (req, res) => {
  try {
    // Validate request
    customValidator.validateNotNullRequest(req);
    const rolUser = await Rol.findOne({ name: 'user' });
    req.body.authorities = [rolUser._id];
    const user = await User.create(req.body);
    // Remove password from output
    user.password = undefined;

    const roles = [];
    roles.push(rolUser.name);
    const token = signToken(user, roles);
    user.token = token;
    let message = '';
    try {
      message = fs.readFileSync(
        path.resolve(__dirname, '../utils/emailTemplates/welcomeUser.html'),
        'utf8'
      );
      message = message.replace(
        '$#$#$#USER#$#$#$',
        `${user.name} ${user.lastname}`
      );
      message = message.replace('$#$#$#EMAIL_USER#$#$#$', `${user.email}`);
    } catch (err) {
      console.error(err);
    }

    await sendEmail({
      email: user.email,
      subject: 'Registro de Usuario',
      message
    });
    return user;
  } catch (error) {
    throw error;
  }
};

// =========== Function to login a user and generate a valid JWT Token
exports.login = async (req, res) => {
  const { email, password } = req.body;
  // 1) Check if email and password exist
  if (!email || !password) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_06}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_06}`,
        'E_ACCESS_CONTROL_MS_06'
      )
    );
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email: email }).select(
    '+password'
  );

  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_07}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_06}`,
        'E_ACCESS_CONTROL_MS_07'
      )
    );
  }

  if(!user.active) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_15}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_15}`,
        'E_ACCESS_CONTROL_MS_15'
      )
    );
  }

  // 3) If everything ok, send token to client, remove sensible data
  const roles = [];
  for (let i = 0; i < user.authorities.length; i++) {
    const rol = await Rol.findById(user.authorities[i]);
    roles.push(rol.name);
  }
  const token = signToken(user, roles);
  user.token = token;
  return cleandUser(user);
};

// =========== Function to get a token to reset password
exports.forgotPassword = async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // return next(new AppError('There is no user with email address.', 404));
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_09}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_09}`,
        'E_ACCESS_CONTROL_MS_09'
      )
    );
  }

  if(!user.active) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_15}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_15}`,
        'E_ACCESS_CONTROL_MS_15'
      )
    );
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${constants.URL_FRONTEND}reset-password/${resetToken}`;

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  let message = '';
  try {
    message = fs.readFileSync(
      path.resolve(__dirname, '../utils/emailTemplates/resetPassword.html'),
      'utf8'
    );

    message = message.replace(
      '$#$#$#USER#$#$#$',
      `${user.name} ${user.lastname}`
    );
    message = message.replace('$#$#$#EMAIL_USER#$#$#$', `${user.email}`);
    message = message.replace('$#$#$#URL_RESET_PASSWORD#$#$#$', `${resetURL}`);
    message = message.replace('$#$#$#URL_RESET_PASSWORD#$#$#$', `${resetURL}`);
  } catch (err) {
    console.error(err);
  }

  try {
    await sendEmail({
      email: user.email,
      subject: 'Reestablecer Contraseña',
      message
    });
    return `${accessControlMessages.EM_ACCESS_CONTROL_MS_01}`;
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_10}`,
        `${err.message}`,
        'E_ACCESS_CONTROL_MS_10'
      )
    );
  }
};

// =========== Function to reset a password with a valid token
exports.resetPassword = async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_11}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_11}`,
        'E_ACCESS_CONTROL_MS_11',
        httpCodes.BAD_REQUEST
      )
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) If everything ok, send token to client, remove sensible data
  const roles = [];
  for (let i = 0; i < user.authorities.length; i++) {
    const rol = await Rol.findById(user.authorities[i]);
    roles.push(rol.name);
  }
  const token = signToken(user, roles);
  user.token = token;
  return cleandUser(user);
};

// =========== Function to update current password
exports.updatePassword = async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.body._id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_12}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_12}`,
        'E_ACCESS_CONTROL_MS_12',
        httpCodes.UNAUTHORIZED
      )
    );
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 3) If everything ok, send token to client, remove sensible data

  const roles = [];
  for (let i = 0; i < user.authorities.length; i++) {
    const rol = await Rol.findById(user.authorities[i]);
    roles.push(rol.name);
  }
  const token = signToken(user, roles);
  user.token = token;
  return cleandUser(user);
};
