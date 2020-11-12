// Created By Eyder Ascuntar Rosales
// Mail: eyder.ascuntar@runcode.co
// Company: Runcode Ingeniería SAS
const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/signup', authController.singUp);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch(
  '/updatePassword',
  authController.protectPath,
  authController.protectPathWithRoles('admin', 'user'),
  authController.updatePassword
);
router.post(
  '/createUser',
  authController.protectPath,
  authController.protectPathWithRoles('admin'),
  userController.createUser
);
router.patch(
  '/updateUser',
  authController.protectPath,
  authController.protectPathWithRoles('admin', 'user'),
  userController.updateUser
);
router.delete(
  '/deleteUser/:id',
  authController.protectPath,
  authController.protectPathWithRoles('admin', 'user'),
  userController.deleteUser
);
router.get(
  '/getUser/:id',
  authController.protectPath,
  authController.protectPathWithRoles('admin', 'user'),
  userController.getUser
);
router.get(
  '/account',
  authController.protectPath,
  authController.protectPathWithRoles('admin', 'user'),
  userController.getAccount
);

router.get(
  '/getAllUsers',
  authController.protectPath,
  authController.protectPathWithRoles('admin'),
  userController.getAllUsers
);

router.get(
  '/getAllUsersTable',
  authController.protectPath,
  authController.protectPathWithRoles('admin'),
  userController.getAllUsersTable
);
module.exports = router;
