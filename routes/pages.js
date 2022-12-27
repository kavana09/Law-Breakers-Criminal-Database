const express = require('express');
const authController = require('../controllers/auth');
const mysql = require('mysql');
const async = require('hbs/lib/async');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { Console } = require('console');
const fileupload = require('express-fileupload');
const path = require('path');


const router = express.Router();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

router.get('/', authController.isLoggedIn,(req, res) => {
    if( req.user ) {
        //console.log(req.user.id);
        db.query('SELECT * FROM complaint WHERE victim_id = ?', [req.user.id], (err, rows) => {
            res.render('index', {
                user: req.user, rows 
            });
        })
        
    } else {
        res.render('index', {
            user: req.user
        });
    }
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/registerpolice', (req, res) => {
    res.render('registerPolice');
});

router.get('/policelogin', (req, res) => {
    res.render('policelogin');
});


router.get('/profile', authController.isLoggedIn, (req, res) => {

    if( req.user ) {
        console.log('user id',req.user.victim_id);
        db.query('SELECT * FROM complaint WHERE victim_id = ?', [req.user.victim_id], (err, rows) => {
            res.render('profile', {
                user: req.user, img: req.user.victim_img, rows 
            });
        });
        
    } else {
        res.redirect('/login');
    }
    
})

router.get('/policeprofile', authController.policeisLoggedIn, (req, res) => {

    if( req.user ) {
        console.log('user id',req.user.police_id);
        db.query('SELECT * FROM complaint WHERE verify = "Not verified"', (err, rows) => {
            res.render('policeprofile', {
                user: req.user, img: req.user.police_photo, rows, access: 'police' 
            });
        });
        
    } else {
        res.redirect('/login');
    }
    
})

router.get('/registercomplaint', authController.isLoggedIn, (req, res) => {

    if( req.user) {
        res.render('registercomplaint', { user: req.user});
    } else {
        res.redirect('/login');
    }
})

router.post('/registercomplaint', authController.isLoggedIn, async (req, res) => {
    //console.log(req.cookies.jwt);
    // const decoded = await promisify(jwt.verify)(req.cookies.jwt,
    //     process.env.JWT_SECRET
    //     );
    // console.log(decoded.id);
    const {first_name, last_name, place, date, description} = req.body;
    db.query('INSERT INTO complaint SET first_name = ?, last_name = ?,place = ?,date = ?,description = ?, victim_id = ?, verify = "Not Verified" ', [first_name, last_name,place,date,description,req.user.victim_id], (err, rows) => {
        if(err) {
            console.log(err);
        } else {
            console.log(rows);
            res.render('registercomplaint',{
                message: 'Complaint registered successfully', user: req.user
            });
        }
    })

});

router.get('/deletecomplaint/:id', authController.isLoggedIn, (req, res) => {  //delete complaint
    const {first_name, last_name, place, description} = req.body;

    db.query('DELETE FROM complaint WHERE complaint_no = ?',[req.params.id],(err, rows) => {
        if(err) {
            console.log(err);
        } else {
            res.redirect('/profile');
        }
        console.log('delete data (update):', rows);
    })
});

router.get('/verifycomplaint/:id', authController.policeisLoggedIn, (req, res) => {  //verify complaint
    const {first_name, last_name, place, description} = req.body;

    db.query('UPDATE complaint SET verify = "Verified" WHERE complaint_no = ?',[req.params.id],(err, rows) => {
        if(err) {
            console.log(err);
        } else {
            db.query('SELECT * FROM complaint WHERE complaint_no = ?',[req.params.id],(err, rows) => {
                if(err) throw err
                console.log('verify data (update):', rows);
                res.render('criminaldata.hbs', { rows });
            });
        }
        
    })
});

router.post('/verifycomplaint/:id', authController.policeisLoggedIn, (req, res) => {
    const {first_name, last_name, place, date, height, weight,ctype,prison_dur,no_of_times, description} = req.body;

    db.query('INSERT INTO crime SET ctype = ?, prison_dur = ?, no_of_times = ?, date = ?, complaint_no = ?',[ctype,prison_dur,no_of_times,date,req.params.id], (err, rows) => { console.log('inserted into crime table') });

    const app = express();
    app.use(fileupload());
    let criminal_photo;
    let uploadPath;
    console.log(req.files);
    if(!req.files || Object.keys(req.files).length === 0){
        return res.status(400).send('No files were uploaded.');
    }

    criminal_photo = req.files.criminal_photo;
    uploadPath = path.relative(__dirname,`node-mysql-login/upload/criminal/${criminal_photo.name}`);

    criminal_photo.mv(uploadPath, function(err) {
        if(err) return res.status(500).send(err);

        db.query('INSERT INTO criminal SET first_name = ?, last_name = ?,place = ?,date = ?,height = ?,weight = ?,description = ?, complaint_no = ?, criminal_photo = ?', [first_name, last_name,place,date,height,weight,description,req.params.id,criminal_photo.name], (err, rows) => {
            if(err) {
                console.log(err);
            } else {
                console.log('insert data',rows);
                res.render('criminaldata',{
                    message: 'Criminal added successfully', user: req.user
                });
            }
        });
    });

    

});

router.get('/editcomplaint/:id', authController.isLoggedIn, (req, res) => {
    //console.log(req.params);
    db.query('SELECT * FROM complaint WHERE complaint_no = ?', [req.params.id], (err, rows) => {
        if(err) {
            console.log(err);
        } else {
            res.render('editcomplaint', {rows, user: req.user});
        }
        console.log('edit comp data: ', rows);
    })
    
});

router.post('/editcomplaint/:id', authController.isLoggedIn, (req, res) => {
    const {first_name, last_name, place, description} = req.body;

    db.query('UPDATE complaint SET first_name = ?, last_name = ?,place = ?,description = ?,victim_id = ? WHERE complaint_no = ?', [first_name, last_name,place,description,req.user.victim_id,req.params.id], (err, rows) => {
        if(err) {
            console.log(err);
        } else {
            db.query('SELECT * FROM complaint WHERE complaint_no = ?', [req.params.id], (err, rows) => {
            res.render('editcomplaint', {rows, user: req.user});
            });
        }
        console.log('edit comp data (update):', rows);
    })
})

// router.get('/viewcomplaint/:id', authController.isLoggedIn, (req, res) => {
//     //console.log(req.params);
//     db.query('SELECT * FROM complaint WHERE complaint_no = ?', [req.params.id], (err, rows) => {
//         if(err) {
//             console.log(err);
//         } else {
//             res.render('viewcomplaint', {rows, user: req.user });
//         }
//         console.log('edit comp data: ', rows);
//     })
    
// });


router.get('/criminals', (req, res) => {
    db.query('SELECT * FROM criminal', (err, rows) => {
        if(err) throw err;
        console.log('criminals rows: ',rows)
        res.render('criminals', { rows });
    });
});


module.exports = router;