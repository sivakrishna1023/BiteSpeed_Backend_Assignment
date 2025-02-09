const express=require('express');
const app=express();
const {CreateTableContacts} = require('./DataBaseSchema/Contact_Schema');

app.use(express.json());

CreateTableContacts();

app.get("/",(req,res)=>{
    res.send("Server Working"); 
});

var port=3000

app.listen(port,()=>{
    console.log(`Server running in port:- ${port}`);
})
