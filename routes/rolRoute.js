// Created By Eyder Ascuntar Rosales
// Mail: eyder.ascuntar@runcode.co
// Company: Runcode Ingeniería SAS
const express = require('express');
const authController = require('../controllers/authController');
const rolController = require('../controllers/rolController');

const router = express.Router();

router.post('/create', 
  authController.protectPath,
  authController.protectPathWithRoles('admin'),
  rolController.createRol
);
router.get(
  '/getRol/:id',
  authController.protectPath,
  authController.protectPathWithRoles('admin'),
  rolController.getRol
);
router.get(
  '/getAllRol',
  authController.protectPath,
  authController.protectPathWithRoles('admin'),
  rolController.getAllRol
);
module.exports = router;
