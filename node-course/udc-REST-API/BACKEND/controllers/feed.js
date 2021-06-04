const {validationResult}=require('express-validator');
const fs=require('fs');
const path=require('path');

const Post=require('../models/post');
const User=require('../models/user');

exports.getPosts=(req,res,next)=>{
    const currentPage=req.query.page||1;
    const perPage=2;
    let totalItems;
    Post
    .find()
    .countDocuments()
    .then(count=>{
        totalItems=count;
        return Post
                .find()
                .skip((currentPage-1)*perPage)
                .limit(perPage);
    })
    .then(posts=>{
        res
        .status(200)
        .json({
            message:'found all posts',
            posts:posts,
            totalItems:totalItems
        })
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
};

exports.postPosts=(req,res,next)=>{
    const errors=validationResult(req);
    const title=req.body.title;
    const content=req.body.content;
    const file=req.file;
    let creator;
    if(!file){
        const error=new Error("file not given");
        throw error;
    }
    if(!errors.isEmpty()){
        const err=new Error("ERROR IN GIVEN INPUT");
        err.statusCode=422;
        throw err;
    }
    const imageUrl=file.path.replace("\\","/");
    const post=new Post({
        creator:req.userId,
        imageUrl:imageUrl,
        title:title,
        content:content,
    })
    post.save()
    .then(result=>{
        return User.findById(req.userId);
    })
    .then(user=>{
        creator=user;
        user.posts.push(post);
        return user.save();
    })
    .then(result=>{
        res
        .status(201)
        .json({
            message:"POST CREATED SUCCESSFULLY",
            post:post,
            creator:{
                _id:creator._id,
                name:creator.name
            }
        });
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    })
}
exports.getPost=(req,res,next)=>{
    const postId=req.params.postId;
    Post
    .findById(postId)
    .then(post=>{
        if(!post){
            const error=new Error("COULD NOT FIND POST");
            error.statusCode=404;
            throw error;
        }
        res
        .status(200)
        .json({
            message:'Post Fetched',
            post:post
        })
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    })
}

exports.updatePost=(req,res,next)=>{
    const errors=validationResult(req);
    if(!errors.isEmpty()){
        const err=new Error("ERROR IN GIVEN INPUT");
        err.statusCode=422;
        throw err;
    }
    const postId=req.params.postId;
    const title=req.body.title;
    const content=req.body.content;
    let imageUrl=req.body.image;
    if(req.file){
        imageUrl= req.file.path.replace('\\','/');
    }
    if(!imageUrl){
        const error=new Error("no file picked");
        error.statusCode=422;
        throw error;
    }
    Post.findById(postId)
    .then(post=>{
        if(!post){
            const error=new Error("could not find post");
            error.statusCode=404;
            throw error;
        }
        if(post.creator.toString()!==req.userId.toString()){
            const error=new Error("Unauthorized");
            error.statusCode=403;
            throw error;
        }
        if(imageUrl!=post.imageUrl){clearImage(post.imageUrl);}
        post.title=title;
        post.content=content;
        post.imageUrl=imageUrl;
        return post.save();
    })
    .then(result=>{
        res
        .status(200)
        .json({
            message:"post updated succesfully",
            post:result
        })
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
}

exports.deletePost=(req,res,next)=>{
    const postId=req.params.postId;
    Post.findById(postId)
    .then(post=>{
        if(!post){
            const error=new Error("could not find post");
            error.statusCode=404;
            throw error;
        }
        if(post.creator.toString()!==req.userId.toString()){
            const error=new Error("Unauthorized");
            error.statusCode=403;
            throw error;
        }
        clearImage(post.imageUrl);
        return Post.findByIdAndRemove(postId)
    })
    .then(result=>{
        return User.findById(req.userId);
    })
    .then(user=>{
        user.posts.pull(postId);
        return user.save();
    })
    .then(result=>{
        res
        .status(200)
        .json({
            message:"Deletion succesful",
        });
    })
    .catch(err=>{
        if(!err.statusCode){
            err.statusCode=500;
        }
        next(err);
    });
}

const clearImage=(filePath)=>{
    filePath=path.join(__dirname,'../',filePath);
    fs.unlink(filePath,(err)=>{if(err)console.log(err);})
}