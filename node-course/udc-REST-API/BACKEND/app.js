const path=require('path');

const express=require('express');
const app=express();

const bodyParser=require('body-parser');

const {v4}=require('uuid');
const multer=require('multer');
const fileStorage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'images');
    },
    filename:(req,file,cb)=>{
        cb(null,v4()+'.'+file.originalname.split('.')[1]);
    }
});
const fileFilter=(req,file,cb)=>{
    if(
        file.mimetype=='image/png'||
        file.mimetype=='image/jpeg'||
        file.mimetype=='image/bmp'||
        file.mimetype=='image/jpg'
    ){
        cb(null,true);
    }
    else{
        cb(null,false);
    }
}

const mongoose=require('mongoose');

const feedRoutes=require('./routes/feed');
const authRoutes=require('./routes/auth');

app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin',"*");
    res.setHeader('Access-Control-Allow-Methods',"GET,POST,PUT,PATCH,DELETE,");
    res.setHeader('Access-Control-Allow-Headers',"Content-Type,Authorization");
    next();
});

app.use(bodyParser.json({type:'application/json'}));

app.use(multer({storage:fileStorage,fileFilter:fileFilter}).single('image'));

app.use('/images',express.static(path.join(__dirname,'images')));

app.use('/feed',feedRoutes);
app.use('/auth',authRoutes);

app.use((err,req,res,next)=>{
    console.log(err);
    const statusCode=err.statusCode||500;
    const message=err.message;
    const data=err.data;
    res.status(statusCode)
    .json({
        message:message,
        data:data
    });
});

mongoose.connect(
    'mongodb+srv://Paul:node-complete@cluster0.3wjlr.mongodb.net/messages?retryWrites=true&w=majority',
{
    useNewUrlParser:true,
    useUnifiedTopology:true
}
)
.then(result=>{
    app.listen(8080);
})
.catch(err=>{
    console.log("DB CONNECT ERROR");
    console.log(err);
})