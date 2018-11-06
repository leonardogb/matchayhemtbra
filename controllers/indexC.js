const express = require('express');
const router = express.Router();
const uniqid = require('uniqid');
const notifModel = require('../models/notifM');
const userModel = require('../models/userM');
const tagModel = require('../models/tagsM');
const profileModel = require('../models/profileM');
const matchimetro = require('../models/matchM');


function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
  
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

router.post('/recup', function(req, res)
{
    const mail = escapeHtml(req.body.mail);
    console.log("Tres");
    userModel.emailExists(mail).then(mailOk => {
        if (mailOk)
        {
            console.log("Cuatro");
            userModel.reinitMDP(mail).then(MdpTemp => {
                if (MdpTemp)
                {
                    userModel.sendMailMdp(mail, MdpTemp).then(ok => {
                        if (ok)
                        {
                            console.log("Message envoyé !");
                            res.render('pages/login', {title: 'Login Matcha !', message: 'Votre mot de passe a été réinitialisé. Vérifier votre mél.', error: ''});
                        }
                    });
                }
            });
        }
        else
            res.render('pages/login', {title: 'Login Matcha !', message: '', error: 'Votre mot de passe ne peut pas être réinitialisé. Merci d\'essayer plus tard.'});
    });
});

router.get('/', function(req, res)
{
    if (req.session && req.session.user)
    {
        // console.log('sesion iniciada');
        // console.log(req.session.user);
        
        userModel.getUserById(req.session.user.id).then( user1 => {
            if (user1 && user1.complet == 1)
            {
                var sex;
                if (user1.genre == "Masculin")
                {
                    if (user1.orientation == "Hétérosexuel")
                        sex = "Féminin";
                    else if (user1.orientation == "Homosexuel")
                        sex = "Masculin";
                    else
                        sex = "Autre";
                }
                else if (user1.genre == "Féminin")
                {
                    if (user1.orientation == "Hétérosexuel")
                        sex = "Masculin";
                    else if (user1.orientation == "Homosexuel")
                        sex = "Féminin";
                    else
                        sex = "Autre";
                }
                userModel.getUserBySex(sex, user1.orientation).then(userTab => {
                    // console.log("Perfiles:");
                    // console.log(userTab);
                    var usuarios = [];
                    var i = 0;
                    userTab.forEach(element => {
                        delete element.passwd;
                        delete element.cle;
                        delete element.mail;
                        const puntos = [];
                        puntos.push(matchimetro.getPtsDistance(user1.lat, user1.lon, element.lat, element.lon));
                        puntos.push(matchimetro.getPtsTags(user1.id, element.id));
                        puntos.push(matchimetro.getPtsPopul(element.popularite));
                        Promise.all(puntos).then(punts => {
                            // console.log("Puntos: ");
                            // console.log(punts);
                            var total = 0;
                            punts.forEach(elem => {
                                total = total + elem;
                            });
                            total = parseInt(total, 10);
                            usuarios.push([total, element]);
                            
                            // matchimetro.setPuntos(element.id, total).then(ptsOk => {
                            //     if (ptsOk)
                            //     {
                            //         userModel.getUserById(element.id).then(result => {
                            //             //Continuar. buscar perfiles a partir de criterios
                            //             usuarios.push(result);
                            //         });
                            //     }
                            // });
                            if (++i == userTab.length)
                            {
                                // console.log("Usuarios:");
                                // console.log(usuarios);
                                function compare(a, b) {
                                    if (a[0] > b[0])
                                       return -1;
                                    if (a[0] < b[0])
                                       return 1;
                                    // a doit être égal à b
                                    return 0;
                                }
                                usuarios.sort(compare);
                                notifModel.getNotifs(req.session.user.id).then(notif => {
                                    //console.log(notif);
                                    res.render('pages/index', {
                                        title: 'Matcha !',
                                        login: req.session.user.login,
                                        userImg: req.session.user.img0,
                                        notif: notif,
                                        profil: usuarios
                                    });
                                });
                            }
                        });
                    });
                    // console.log("Usuarios:");
                    // console.log(usuarios);
                });
            }
            else
            {
                delete user1.passwd;
                delete user1.cle;
                //console.log(result);
                tagModel.getTags(user1.id).then( tagsTab => {
                    console.log(tagsTab);
                    notifModel.getNotifs(req.session.user.id).then(notif => {
                        res.render('pages/profileUpdate', {
                            title: "Profil de " + user1.prenom,
                            message: "",
                            error: "Vous devez completer votre profil.",
                            login: user1.login,
                            tabuser: user1,
                            tabTags: tagsTab,
                            notif: notif,
                            userImg: req.session.user.img0
                        });
                    });
                    
                }).catch(function(err)
                {
                    console.log(err);
                    //res.redirect('/');
                });
            }
        });
        // notifModel.getNotifs(req.session.user.id).then(notif => {
        //     //console.log(notif);
        //     res.render('pages/index', {
        //         title: 'Matcha !',
        //         login: req.session.user.login,
        //         notif: notif
        //     });
        // });
        
    }
    else
    {
        console.log('session no iniciada');
        res.render('pages/signup', { title: 'Signup Matcha !', message: '', error: '' });
    }
        
});

module.exports = router;
