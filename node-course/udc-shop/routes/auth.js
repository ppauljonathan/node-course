const express=require('express');
const router=express.Router();
const {body}=require('express-validator');

const User=require('../models/user');

const authController=require('../controllers/auth');

router.get('/login',authController.getLogin);
router.post(
    '/login',
    [
        body('email')
          .isEmail()
          .withMessage('Please enter a valid email address.')
          .normalizeEmail(),
        body('password', 'Password has to be valid.')
          .isLength({ min: 5 })
          .isAlphanumeric()
          .trim()
      ],
    authController.postLogin
);

router.post('/logout',authController.postLogout);

router.get('/signup',authController.getSignup);
router.post(
    '/signup',
    [
        body('email')
        .isEmail()
        .withMessage('Please Enter a Valid Email')
        .custom((value,{req})=>{
            return User.findOne({email:value})
            .then(userDoc=>{
                if(userDoc){
                    return Promise.reject('Sorry,email already exists');
                }
            })
        })
        .normalizeEmail(),
        body('password','Password length should be more than 5 characters and not contain special characters')
        .isLength({min:5})
        .isAlphanumeric()
        .trim(),
        body('confirmPassword')
        .custom((value,{req})=>{
            if(value!==req.body.password){
                throw Error('Passwords do not match');
            }
            return true;
        })
        .trim()
    ],
    authController.postSignup
);

router.get('/reset',authController.getReset);
router.post('/reset',authController.postReset);

router.get('/reset/:token',authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);

module.exports=router