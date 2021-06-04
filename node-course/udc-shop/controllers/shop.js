const Product = require('../models/product');
const Order = require('../models/order');
const fs=require('fs');
const path=require('path');
const PDFDocument=require('pdfkit');
const stripe=require('stripe')('sk_test_51IRX8mCw5ttNgLBJJQ26gtDl4RJsVa8CaMhCG6Np9RRxiaCHdl6cg4EaZSWKMvRGIWbrBJQ3aDftYxAUr8XMaTOw00yUXUAHEd')
const ITEMS_PER_PAGE=2;

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
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Shop',
        path: '/products',
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

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => {const error=new Error(err);
      error.httpStatusCode=500;
      return next(error);});
};

exports.getIndex = (req, res, next) => {
  const page=+req.query.page||1 ;

  let totalItems;

  Product.find().countDocuments().then(num=>{
    totalItems=num;
    return Product.find()
    .skip((page-1)*ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
  .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
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

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => {
      const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
    });
};

module.exports.getCheckout=(req,res,next)=>{
  let products,total;
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      total=0
      products = user.cart.items;
      products.forEach(p=>{
        total+=p.quantity*p.productId.price;
      })
      return stripe.checkout.sessions.create({
        payment_method_types:['card'],
        line_items:products.map(p=>{
          return {
            price_data:{
              currency:'usd',
              product_data:{
                name:p.productId.title,
              },
              unit_amount:Math.floor(p.productId.price*100)
            },
            quantity:p.quantity
          }
        }),
        mode:'payment',
        success_url:req.protocol+'://'+req.get('host')+'/checkout/success',
        cancel_url:req.protocol+'://'+req.get('host')+'/checkout/cancel'
      });
    })
    .then(session=>{
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum:total,
        sessionId:session.id
      });
    })
    .catch(err => {
      const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
    });
}

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, data: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {const error=new Error(err);
      error.httpStatusCode=500;
      return next(error);});
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => {
      const error=new Error(err);
    error.httpStatusCode=500;
    return next(error);
    });
};

exports.getInvoice=(req,res,next)=>{
  const orderId=req.params.orderId;
  Order.findById(orderId)
  .then(order=>{
    if(!order){return next(new Error('Order Not Found'));}
    if(order.user.userId.toString()!==req.user._id.toString()){
      return next(new Error('Unauthourized'));
    }
    const invoiceName=`invoice-${orderId}.pdf`;
    const invoicePath=path.join(__dirname,'../','data','invoices',invoiceName);
    const pdfDoc=new PDFDocument();

    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','inline');
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(18).text('Invoice',{
      underline:true
    });
    pdfDoc.text('-----------------------------------------');
    let total=0;

    order.products.forEach(prod=>{
      pdfDoc.fontSize(14);
      pdfDoc.text(`${prod.data.title}  -  ${prod.quantity} x \$${prod.data.price}  =  \$${prod.data.price*prod.quantity}`);
      total+=(prod.data.price*prod.quantity);
    });

    pdfDoc.text('-----------------------------------------');

    pdfDoc.text(`GRAND TOTAL = \$${total}`)

    pdfDoc.end();
    // fs.readFile(invoicePath,(err,data)=>{
    //   if(err){return next(err);}
    //   res.setHeader('Content-Type','text/plain');
    //   res.setHeader('Content-Disposition','inline');
    //   res.send(data)
    // })

    // const file=fs.createReadStream(invoicePath);
    // file.pipe(res);
  })
  .catch(err=>{return next(err)})
}