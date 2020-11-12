// Created By Eyder Ascuntar Rosales
// Mail: eyder.ascuntar@runcode.co
// Company: Runcode Ingeniería SAS
const mongoose = require('mongoose');
const customValidator = require('../utils/validators/validator');
const ApiError = require('../dto/commons/response/apiErrorDTO');
const ServiceException = require('../utils/errors/serviceException');
const commonErrors = require('../utils/constants/commonErrors');
const accessControlMessages = require('../utils/constants/accessControlMessages');
const Rol = require('../models/rolModel');
const httpCodes = require('../utils/constants/httpCodes');
const APIFeatures = require('../utils/responses/apiFeatures');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// =========== Function to register a new rol
exports.createRol = async (req, res) => {
  try {
    // Validate request
    customValidator.validateNotNullRequest(req);
    const rol = await Rol.create(req.body);
    return rol;
  } catch (error) {
    throw error;
  }
};

// =========== Function to get a specific Rol
exports.getRol = async (req, res) => {
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
  const rol = await Rol.findById(req.params.id);
  if (!rol) {
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
  return rol;
};

// =========== Function to get all Rol
exports.getAllRol = async (req, res) => {
  const features = new APIFeatures(Rol.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const rol = await features.query;
  return rol;
};
