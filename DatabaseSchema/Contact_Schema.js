const {getClient}=require('../DatabaseConnection');

async function CreateTableContacts() {
    try{
        const client=await getClient();
        await client.query(`
            CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            phoneNumber VARCHAR(255),
            email VARCHAR(255),
            linkedId INT,
            linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')),
            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deletedAt TIMESTAMP
            );
        `);
        console.log("Contacts Table Created");
    }catch(error){
        console.log("Error In Creating the Table", error);
    }
}

module.exports = { CreateTableContacts };