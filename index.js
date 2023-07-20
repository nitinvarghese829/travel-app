const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs')
require('dotenv').config();
const jwt = require('jsonwebtoken');
const download = require('image-downloader');
const multer  = require('multer')
const fs = require("fs");
const {json} = require("express");
const mongoose = require("mongoose");
const User = require('./models/User');
const Category = require('./models/Category');
const Destination = require('./models/Destination');
const Packages = require('./models/Packages');
const PORT = process.env.PORT || 4000


const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'test';

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname+'/uploads'));
app.use(cors({
    credentials: true,
    origin: 'https://64b96c4886e4fc17fa1792a4--beamish-daifuku-e558e6.netlify.app/',
    headers: {
        'Access-Control-Allow-Origin': '*'
    }
}));

mongoose.connect(process.env.MONGO_URL)

app.get('/test', (req, res) => {
    res.json("ok");
})

app.post('/upload-photo', async (req, res) => {
    const {link} = req.body;
    const fn = Date.now() + '.jpg';
    const options = {
        url: link,
        dest: __dirname + '/uploads/' + fn,     // will be saved to /path/to/dest/photo.jpg
    };
    download.image(options)
        .then(({ filename }) => {
            res.json(fn); // saved to /path/to/dest/photo.jpg
        })
        .catch((err) => {
            res.json('no');
            console.error(err);
        });
});

const photosMiddleware = multer({dest: 'uploads/'});
app.post('/uploads', photosMiddleware.array('photos', 100), (req, res) => {
    console.log(req.files);
    const uploadedPhotos = [];
    for (let i = 0; i < req.files.length; i++) {
        const {path, originalname} = req.files[i];
        const parts = originalname.split('.');

        const ext = parts[parts.length - 1];
        const fn = path + '.' + ext;

        fs.renameSync(path, fn);

        uploadedPhotos.push(fn.replace('uploads/', ''));

    }
    res.json(uploadedPhotos);
});

app.post('/register', (req, res) => {
    const {name, email, password} = req.body;
    try{
        const userDoc = User.create({name, email, password: bcrypt.hashSync(password, bcryptSalt), role: ['ROLE_USER']});
        res.json(userDoc);
    } catch (e) {
        res.json(null);
    }
});

app.post('/login', async (req, res) => {

    const { email, password } = req.body;
    try {
        const userDoc =  await User.findOne({email})


        if(userDoc){
            const checkPassword = bcrypt.compareSync(password, userDoc.password);
            if(checkPassword){
                jwt.sign({
                    email: userDoc.email,
                    id: userDoc._id,
                    role: userDoc.role
                }, jwtSecret, {}, (err, token) => {
                    if (err) throw err;
                    res.cookie('token', token).json(userDoc);
                });

            } else {
                res.status(422).json('pass error');
            }

        } else {
            res.json('not found');
        }
    } catch (e) {
        res.status(422).json(e);
    }

});

app.get('/profile', (req, res) => {
    const {token} = req.cookies;
    if(token){
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            const {name, email, _id, role} = await User.findById(userData.id);
            res.json({name, email, _id, role});
        });
    } else {
        res.json(null);
    }
});

app.get('/logout', (req, res) => {
    res.cookie('token', '').json(true);
});

const getLoggedInUser = (req) => {
    const {token} = req.cookies;
    if (!token) {
        // Resolve with null when there is no JWT token
        return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if(err) {
                reject(err);
            } else {
                resolve(userData);
            }
        });
    })

}

const checkUserAdmin = async (req) => {
    const userData = await getLoggedInUser(req);
    if (userData?.role.includes('ROLE_ADMIN')){
        return true;
    } else {
        return false;
    }
}

app.get('/admin/user-count', async (req, res) => {
    if(await checkUserAdmin(req)){
        const userCount = await User.countDocuments({ role: 'ROLE_USER' });
        const domesticCount = await Packages.countDocuments({ type: 'domestic' });
        const internationalCount = await Packages.countDocuments({ type: 'international' });

        res.json({userCount, domesticCount, internationalCount});
    } else {
        res.json(null)
    }
});

const pageSize = 3;
app.post('/admin/category/list', async (req, res) => {
    if(await checkUserAdmin(req)){
        const { currentPage } =  req.body;
        const totalCount = await Category.countDocuments();
        const categories = await Category.find().skip((currentPage - 1) * pageSize)
            .limit(pageSize);
        const totalPages = Math.ceil(totalCount / pageSize);


        res.json({
            categories, currentPage,
            totalPages,
            totalCount
        });
    }
});

app.get('/admin/category/list', async (req, res) => {
    if(await checkUserAdmin(req)){
        const categories = await Category.find();

        res.json(categories);
    }
});

app.post('/admin/category/create', async (req, res) => {
    const {name} = req.body;
    if(await checkUserAdmin(req)){
        const category = await Category.create({ name });

        res.json(category);
    }
})

app.post('/admin/destination/list', async (req, res) => {
    if(await checkUserAdmin(req)){
        const { currentPage } =  req.body;
        const totalCount = await Destination.countDocuments();
        const destinations = await Destination.find().skip((currentPage - 1) * pageSize)
            .limit(pageSize);
        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            destinations, currentPage,
            totalPages,
            totalCount
        });
    }
});

app.get('/admin/destination/list', async (req, res) => {
    if(await checkUserAdmin(req)){
        const destinations = await Destination.find();

        res.json(destinations);
    }
});

app.post('/admin/destination/create', async (req, res) => {
    const {name} = req.body;
    if(await checkUserAdmin(req)){
        const destination = await Destination.create({ name });

        res.json(destination);
    }
})

app.get('/admin/:type/packages/all', async (req, res) => {
    const {type} = req.params
    console.log('241', type);
    // res.json(type);
    if(await checkUserAdmin(req)){
        const _packages = await Packages.find({type: type}).populate('destination').populate('category');

        res.json(_packages);
    }
});

app.get('/admin/packages/:text', async (req, res) => {
    const {text} = req.params
    console.log(text);
    // res.json(type);
    if(await checkUserAdmin(req)){
        const regexPattern = new RegExp(`.*${text}.*`, 'i');


            const _packages = await Packages.find(text === 'all' ? {} : {title: {$regex: regexPattern}}).populate('destination').populate('category');


        res.json(_packages);
    }
});

app.get('/admin/packages/fetch/:type/:id', async (req, res) => {
    const {type, id} = req.params
    console.log(type);
    // res.json(type);
    if(await checkUserAdmin(req)){
        const _packages = await Packages.findOne({type: type, _id: id}).populate('destination').populate('category');

        res.json(_packages);
    }
});

app.post('/admin/package/create', async (req, res) => {
    const {title,
        destination,
        category,
        photos,
        itinerary,
        highlights,
        inclusion,
        exclusion,
        price,
        type} = req.body;
    if(await checkUserAdmin(req)){
        const _package = await Packages.create({ title,
            destination,
            category,
            photos,
            itinerary,
            highlights,
            inclusion,
            exclusion,
            price,
            type });

        res.json(_package);
    }
})

app.put('/admin/package/update', async(req, res) => {
    const { id, title,
        destination,
        category,
        photos,
        itinerary,
        highlights,
        inclusion,
        exclusion,
        price,
        type} = req.body;
    const _package = await Packages.findById(id);

    if(await checkUserAdmin(req)){
        _package.set({ title,
            destination,
            category,
            photos,
            itinerary,
            highlights,
            inclusion,
            exclusion,
            price,
            type })
        await _package.save();
        console.log("test");
        res.json("ok");
    }



})

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`)
})