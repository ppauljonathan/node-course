const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');
const isAuth=require('../middleware/is-auth');

const {body}=require('express-validator');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product',isAuth,adminController.getAddProduct);

// /admin/products => GET
router.get('/products',isAuth,adminController.getProducts);

// /admin/add-product => POST
router.post(
    '/add-product',
    isAuth,
    [
        body('title')
        .isString()
        .isLength({min:3})
        .trim()
        .withMessage("The title must be alphanumeric and more than 3 characters"),
        body('imageUrl')
        .trim(),
        body('price')
        .isFloat()
        .withMessage("Price must be floating point decimal"),
        body('description')
        .isLength({min:5,max:400})
        .trim()
        .withMessage("Description must be at least 5 characters")
    ],
    adminController.postAddProduct
);

router.get('/edit-product/:productId',isAuth,adminController.getEditProduct);

router.post(
    '/edit-product',
    isAuth,
    [
        body('title')
        .isString()
        .isLength({min:3})
        .trim()
        .withMessage("The title must be alphanumeric and more than 3 characters"),
        body('price')
        .isFloat()
        .withMessage("Price must be floating point decimal"),
        body('description')
        .isLength({min:5,max:400})
        .trim()
        .withMessage("Description must be at least 5 characters")
    ], 
    adminController.postEditProduct
);

router.delete('/product/:productId',isAuth, adminController.deleteProduct);

module.exports = router;
