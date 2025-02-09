const {Client}= require("pg")

async function getClient() {
   try{
    const client=new Client("postgresql://Learndb_owner:2TsRtSCapbq0@ep-gentle-lab-a5r7jjit.us-east-2.aws.neon.tech/Learndb?sslmode=require");
    await client.connect();
    console.log("Connected to DataBase"); 
    return client;
   }catch(error){
    console.log("Error while connecting to Database");
   }
}


module.exports={getClient};