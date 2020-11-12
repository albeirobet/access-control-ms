// Created By Eyder Ascuntar Rosales
// Mail: eyder.ascuntar@runcode.co
// Company: Runcode Ingeniería SAS
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const ApiError = require('../dto/commons/response/apiErrorDTO');
const UserLst = require('../dto/commons/userLstDTO');
const Account = require('../dto/commons/accountDTO');
const ServiceException = require('../utils/errors/serviceException');
const commonErrors = require('../utils/constants/commonErrors');
const accessControlMessages = require('../utils/constants/accessControlMessages');
const User = require('../models/userModel');
const Rol = require('../models/rolModel');
const httpCodes = require('../utils/constants/httpCodes');
const APIFeatures = require('../utils/responses/apiFeatures');
const customValidator = require('../utils/validators/validator');
const sendEmail = require('./../utils/email');

// =========== Function to filter specific properties to udpate
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// =========== Function to register a new user
exports.createUser = async (req, res) => {
  try {
    // Validate request
    customValidator.validateNotNullRequest(req);
    const pass = Math.random()
      .toString(36)
      .substr(2, 8);
    req.body.password = pass;
    req.body.passwordConfirm = pass;
    console.log('pass: ', req.body.password);
    const user = await User.create(req.body);

    let message = '';
    try {
      message = fs.readFileSync(
        path.resolve(__dirname, '../utils/emailTemplates/newUser.html'),
        'utf8'
      );
      message = message.replace(
        '$#$#$#USER#$#$#$',
        `${user.name} ${user.lastname}`
      );
      message = message.replace('$#$#$#EMAIL_USER#$#$#$', `${user.email}`);
      message = message.replace('$#$#$#PASSWORD_USER#$#$#$', `${pass}`);
    } catch (err) {
      console.error(err);
    }
    await sendEmail({
      email: user.email,
      subject: 'Bienvenido a RunCode System',
      message
    });
    return user;
  } catch (error) {
    throw error;
  }
};

// =========== Function to update a user
exports.updateUser = async (req, res) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_13}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_13}`,
        'E_ACCESS_CONTROL_MS_13',
        httpCodes.BAD_REQUEST
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    'name',
    'lastname',
    'email',
    'authorities',
    'active',
    'companyId'
  );

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.body._id, filteredBody, {
    new: true,
    runValidators: true
  });
  return updatedUser;
};

// =========== Function to delete/inactive a user
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  return true;
};

// =========== Function to get a specific User
exports.getUser = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${commonErrors.EM_COMMON_10}`,
        `${commonErrors.EM_COMMON_10}`,
        'EM_COMMON_10',
        httpCodes.BAD_REQUEST
      )
    );
  }
  const user = await User.findById(req.params.id);
  // User.findOne({ _id: req.params.id })
  if (!user) {
    throw new ServiceException(
      commonErrors.E_COMMON_01,
      new ApiError(
        `${accessControlMessages.E_ACCESS_CONTROL_MS_14}`,
        `${accessControlMessages.E_ACCESS_CONTROL_MS_14}`,
        'E_ACCESS_CONTROL_MS_14',
        httpCodes.BAD_REQUEST
      )
    );
  }
  return user;
};

// =========== Function to get a user account
exports.getAccount = async (req, res) => {
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
  console.log('decoded: ', decoded);
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
    } else {
      // --- Set Authorities
      const roles = [];
      for (let i = 0; i < currentUser.authorities.length; i++) {
        const rol = await Rol.findById(currentUser.authorities[i]);
        roles.push(rol.name);
      }
      const account = new Account();
      account.authorities = roles;
      account.user = currentUser;
      console.log('retorna: ', account);
      return account;
    }
  } else {
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
};

// =========== Function to get all Users
exports.getAllUsers = async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const users = await features.query;
  const usersAuthorities = [];
  // --- Set Authorities
  for (let u = 0; u < users.length; u++) {
    const roles = [];
    for (let i = 0; i < users[u].authorities.length; i++) {
      const rol = await Rol.findById(users[u].authorities[i]);
      roles.push(rol.name);
    }
    const account = new Account();
    account.authorities = roles;
    account.user = users[u];
    usersAuthorities.push(account);
  }

  return usersAuthorities;
};

// =========== Function to get all Users with filters to the table
exports.getAllUsersTable = async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filterTable()
    .sort()
    .limitFields()
    .paginate();

  const total = await User.countDocuments();
  const users = await features.query;
  const usersAuthorities = [];
  // --- Set Authorities
  for (let u = 0; u < users.length; u++) {
    const roles = [];
    for (let i = 0; i < users[u].authorities.length; i++) {
      const rol = await Rol.findById(users[u].authorities[i]);
      roles.push(rol.name);
    }
    const account = new Account();
    account.authorities = roles;
    account.user = users[u];
    usersAuthorities.push(account);
  }

  const userList = new UserLst(total, usersAuthorities);
  return userList;
};
