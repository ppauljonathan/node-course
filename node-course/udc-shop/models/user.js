const mongoose=require('mongoose');

const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    cart:{
        items:[{
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'Product',
                required:true
            },
            quantity:{
                type:Number,
                required:true
            }
        }]
    },
    resetToken:String,
    resetTokenExp:Date
});

userSchema.methods.addToCart=function(product){
    const cartProductIndex=this.cart.items.findIndex(cp=>{
        return cp.productId.toString()===product._id.toString();
    });
    let newQty=1;
        
    const updatedCartItems=[...this.cart.items];
    if(cartProductIndex>=0){
        newQty=this.cart.items[cartProductIndex].quantity+1;
        updatedCartItems[cartProductIndex].quantity=newQty;
    }else{
        updatedCartItems.push({productId:product._id,quantity:newQty})
    }
        
    const updatedCart={items:updatedCartItems};
    this.cart=updatedCart;
    return this.save();
}

userSchema.methods.removeFromCart=function(prodId){
    const updatedCartItems=this.cart.items.filter(item=>{
        return item.productId.toString()!==prodId.toString();
    });
    this.cart.items=updatedCartItems;
    return this.save();
}

userSchema.methods.clearCart=function(){
    this.cart={items:[]};
    return this.save();
}

module.exports=mongoose.model('User',userSchema);