const express = require('express');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const async = require('hbs/lib/async');
const { promisify } = require('util');
const { Console } = require('console');
const fileupload = require('express-fileupload');
const path = require('path');

 

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

exports.login = async (req, res) => {
    console.log('onjoenoj');
    console.log(req.body.password);
    try {
        //const { email, password } = req.body;
        const email = req.body.email;
        const password = req.body.password;

        if( !email || !password ) {
            return res.status(400).render('login', {
                message: 'Please provide an email and password'
            })
        }

        db.query('SELECT * FROM victim WHERE email = ?', [email], async (error, results) => {
            console.log('results ',results);
            if( Object.keys(results).length==0 || !(await bcrypt.compare(password, results[0].password ) ) ) {
                res.status(401).render('login', {
                    message: 'Email or Password is incorrect'
                })
            } else {
                const id = results[0].victim_id;
                console.log('results id',results[0].victim_id);
                const token = jwt.sign({ id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });

                console.log("the token is: " + token);

                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24*60*60*1000
                    ),
                    httpOnly: true
                }

                res.cookie('jwt', token, cookieOptions);
                res.status(200).redirect("/");
            }

        })

    } catch (error) {
        console.log(error);
    }
}

exports.register = (req, res) => {
    console.log(req.body);

    //const { name, email, password, passwordConfirm } = req.body;
    const name = req.body.name, email = req.body.email, password = req.body.password, passwordConfirm = req.body.passwordConfirm;
    db.query('SELECT email FROM victim WHERE email = ?', [email], async (error, results) => {
        if(error) {
            console.log(error);
        } 

        if(results.length > 0) {
            return res.render('register', {
                message: 'That email is already in use'
            })
        } else if(password !== passwordConfirm) {
            return res.render('register', {
                message: 'Passwords do not match'
            });
        }

        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);

        const app = express();
        app.use(fileupload());
        let victim_img;
        let uploadPath;

        if(!req.files || Object.keys(req.files).length === 0){
            return res.status(400).send('No files were uploaded.');
        }

        victim_img = req.files.victim_img;
        //uploadPath = __dirname + '../upload/' + victim_img.name;
        uploadPath = path.relative(__dirname,`node-mysql-login/upload/victim/${victim_img.name}`);

        victim_img.mv(uploadPath, function(err) {
            if(err) return res.status(500).send(err);

            db.query('INSERT INTO victim SET ?', {name: name, email: email, password: hashedPassword, victim_img: victim_img.name }, (error, results) => {
                if(error) {
                    console.log(error);
                } else {
                    return res.render('register', {
                        message: 'User Registered'
                    });
                }
            });

        });  

    });

}

exports.isLoggedIn = async (req, res, next) => {
    console.log('cookies',req.cookies);
    if(req.cookies.jwt) {
        try {
            //1) verify the token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );

            console.log('cookie data',decoded.id);

            //2) check if the user still exists
            db.query('SELECT * FROM victim WHERE victim_id = ?', [decoded.id], (error, results) => {
                console.log('query ans',results);

                if(!results) {
                    return next();
                }

                req.user = results[0];
                return next();

            });
        } catch (error) {
            console.log(error);
            return next();
        }
    } else {
        next();
    }

}

exports.logout = async (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2*1000), 
        httpOnly: true
    });

    res.status(200).redirect('/');
}

exports.policeregister = (req, res) => {
    console.log(req.body);

    //const { name, email, password, passwordConfirm } = req.body;
    const name = req.body.name, email = req.body.email, password = req.body.password, passwordConfirm = req.body.passwordConfirm;
    db.query('SELECT email FROM police WHERE email = ?', [email], async (error, results) => {
        if(error) {
            console.log(error);
        } 

        if(results.length > 0) {
            return res.render('register', {
                message: 'That email is already in use'
            })
        } else if(password !== passwordConfirm) {
            return res.render('register', {
                message: 'Passwords do not match'
            });
        }

        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);

        const app = express();
        app.use(fileupload());
        let police_photo;
        let uploadPath;

        if(!req.files || Object.keys(req.files).length === 0){
            return res.status(400).send('No files were uploaded.');
        }

        police_photo = req.files.police_photo;
        //uploadPath = __dirname + '../upload/' + victim_img.name;
        uploadPath = path.relative(__dirname,`node-mysql-login/upload/police/${police_photo.name}`);

        police_photo.mv(uploadPath, function(err) {
            if(err) return res.status(500).send(err);

            db.query('INSERT INTO police SET ?', {name: name, email: email, password: hashedPassword, police_photo: police_photo.name }, (error, results) => {
                if(error) {
                    console.log(error);
                } else {
                    return res.render('registerpolice', {
                        message: 'Police User Registered'
                    });
                }
            });

        });  

    });

}

exports.policelogin = async (req, res) => {
    console.log('onjoenoj');
    console.log(req.body.password);
    try {
        //const { email, password } = req.body;
        const email = req.body.email;
        const password = req.body.password;

        if( !email || !password ) {
            return res.status(400).render('policelogin', {
                message: 'Please provide an email and password'
            })
        }

        db.query('SELECT * FROM police WHERE email = ?', [email], async (error, results) => {
            console.log('results ',results);
            if( Object.keys(results).length==0 || !(await bcrypt.compare(password, results[0].password ) ) ) {
                res.status(401).render('policelogin', {
                    message: 'Email or Password is incorrect'
                })
            } else {
                const pid = results[0].police_id;
                console.log('results id',results[0].police_id);
                const token = jwt.sign({ pid }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });

                console.log("the token is: " + token);

                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24*60*60*1000
                    ),
                    httpOnly: true
                }

                res.cookie('jwt', token, cookieOptions);
                //res.status(200).redirect("/", {access: 'police'});
                res.render('index', { access: 'police' });
            }

        })

    } catch (error) {
        console.log(error);
    }
}

exports.policeisLoggedIn = async (req, res, next) => {
    console.log('cookies',req.cookies);
    if(req.cookies.jwt) {
        try {
            //1) verify the token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );

            console.log('cookie data',decoded.pid);

            //2) check if the user still exists
            db.query('SELECT * FROM police WHERE police_id = ?', [decoded.pid], (error, results) => {
                console.log('query ans',results);

                if(!results) {
                    return next();
                }

                req.user = results[0];
                return next();

            });
        } catch (error) {
            console.log(error);
            return next();
        }
    } else {
        next();
    }

}

