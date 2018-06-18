const express= require('express');
const bodyParser = require('body-parser');
const bcrypt=require('bcrypt-nodejs');
const cors=require('cors');
const knex = require('knex');

const pg=knex({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : 'postgres',
        database : 'colormatcher'
      }
})

const app = express();
app.use(bodyParser.json());
app.use(cors());

// console.log(pg.select('*').from('users').then(data=>{console.log(data)}));
app.post('/signin',(req,res)=>{
    // console.log(req.body.email);
    pg.select('email','hash').from('login')
    .where('email','=',req.body.email )
    .then(data => {
        const isValid=bcrypt.compareSync(req.body.password,data[0].hash);
        if(isValid){
           return pg.select('*').from('users')
            .where('email','=',req.body.email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json("unable to get user"))
        } else {
            res.status(400).json("Wrong credentials");
        }
    })
    .catch(err => {res.status(400).json("wrong creds")})
})
app.post('/register',(req,res)=>{
//    console.log(req.body.email, req.body.password, req.body.name,new Date());
   const { email, name, password} = req.body;
   const hash = bcrypt.hashSync(password);
   pg.transaction(trx =>{
       trx.insert({
           hash:hash,
           email:email
       })
       .into('login')
       .returning('email')
       .then(loginEmail => {
        return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date(),
                dateplayed: new Date()
            })
            .then(user=>{
                res.json(user[0]);
            })
       })
       .then(trx.commit)
       .catch(trx.rollback)
   })   
   .catch(err =>{
       res.status(400).json("unable to join");
   })
})

app.put('/updatescore/:id',(req,res)=>{
    const { id } = req.params;
    const { score } = req.body;
    let currentScore=0;
    pg.select('score').from('users').where({id}).returning('score').then(score=>{currentScore=score});
    // console.log("Current Score:"+currentScore)
    if(score>currentScore){
        pg('users')
        .returning('*')
        .where({id})
        .update({score})
        .then(score=>{
            res.json(score[0]);
        })
        .catch(err=>{res.status(400).json("Cannot update score")})
    }   
})

// app.get("/highscore/:id",(req,res)=>{
//     const { id } = req.params;
//     pg('users').where({id}).max('score')
//     .then(score=>{res.json(score[0])});
// })

app.get("/profile/:id",(req,res)=>{
    const { id } = req.params;
    pg('users').where({id:id}).select('*')
    .then(user=>{
        if(user.length >0){
            res.json(user[0])
        } else {
            res.status(400).json("user not found")
        }
    });
})

app.get("/",(req,res)=>{
    res.json("Home page buddy");
})

const PORT=3002; //process.env.PORT;
app.listen(PORT,()=>{
    console.log("Listening on port "+PORT);
});

// console.log(process.env);

/*
signin - post
register - post
putScore/id,score - put
getScore/best - get
/profile/id - get


*/