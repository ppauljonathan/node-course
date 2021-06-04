const fs=require('fs');
const path=require('path')

const mongoose=require('mongoose');

const Product = require('../models/product');
const {validationResult}=require('express-validator')

const ITEMS_PER_PAGE=2;

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError:false,
    product:{},
    errorMessage:null,
    validationErrors:[]
  });
};

exports.postAddProduct = (req, res, next) => {
  
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if(!image){
    return res.status(422)
    .render('admin/edit-product',{
      pageTitle:'Add Product',
      path:'/admin/add-product',
      editing:false,
      hasError:true,
      product:{
        title:title,
        price:price,
        description:description
      },
      errorMessage:'File is not image',
      validationErrors:[]
    });
  }
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422)
    .render('admin/edit-product',{
      pageTitle:'Add Product',
      path:'/admin/add-product',
      editing:false,
      hasError:true,
      product:{
        title:title,
        price:price,
        description:description
      },
      errorMessage:errors.array()[0].msg,
      validationErrors:errors.array()
    });
  }
  var imageUrl=image.path;
  imageUrl="\\"+imageUrl;
  console.log(imageUrl);
  const product=new Product({
    title:title,
    imageUrl:imageUrl,
    price:price,
    description:description,
    userId:req.user
  });
  product.save()
  .then(result=>{
    console.log('Created Product');
    res.redirect('/admin/products');
  })
  .catch(err=>{
    // return res.status(500)
    // .render('admin/edit-product',{
    //   pageTitle:'Add Product',
    //   path:'/admin/add-product',
    //   editing:false,
    //   hasError:true,
    //   product:{
    //     title:title,
    //     imageUrl:imageUrl,
    //     price:price,
    //     description:description
    //   },
    //   errorMessage:'DBop failed Pls Try again',
    //   validationErrors:[]
    // });
    const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
  });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
  .then( product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        hasError:false,
        product: product,
        errorMessage:null,
        validationErrors:[]
      });
    }
  )
  .catch(err=>{
    console.log(err);
  });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422)
    .render('admin/edit-product',{
      pageTitle:'Edit Product',
      path:'/admin/add-product',
      editing:true,
      hasError:true,
      product:{
        title:updatedTitle,
        imageUrl:updatedImageUrl,
        price:updatedPrice,
        description:updatedDesc,
        _id:prodId
      },
      errorMessage:errors.array()[0].msg,
      validationErrors:errors.array()
    });
  }

  Product.findById(prodId)
  .then(product=>{
    if(product.userId.toString()!==req.user._id.toString()){return res.redirect('/')}
    product.title=updatedTitle;
    product.price=updatedPrice;
    product.description=updatedDesc;
    if(image){
      fs.unlink(
        path.join(
          __dirname,
          '../',
          product.imageUrl
        ),
        (err)=>{
          if(err){return console.log(err);}
          return;
        }
      );
      product.imageUrl='\\'+image.path;
    }
    return product.save()
    .then(result=>{
      console.log("UPDATED");
      res.redirect('/admin/products');
    })
  })
  .catch(err=>{const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);});
};

exports.getProducts = (req, res, next) => {
  const page=+req.query.page||1 ;

  let totalItems;

  Product.find().countDocuments().then(num=>{
    totalItems=num;
    return Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
  .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        csrfToken:req.csrfToken(),
        currPage:page,
        hasNextPage:ITEMS_PER_PAGE*page<totalItems,
        hasPrevPage:page>1,
        nextPage:page+1,
        prevPage:page-1,
        lastPage:Math.ceil(totalItems/ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findOne({_id:prodId,userId:req.user._id})
  .then(product=>{
    fs.unlink(path.join(__dirname,'../',product.imageUrl),(err)=>{if(err){return console.log(err);}})
    return Product.deleteOne({_id:prodId,userId:req.user._id})
  })
  .then(result=>{
    console.log("DESTROYED");
    res.status(200).json({message:"Success"});
  })
  .catch(err=>{
    res.status(500).json({message:"FAILED TO DELETE PRODUCT"});
  });
};
