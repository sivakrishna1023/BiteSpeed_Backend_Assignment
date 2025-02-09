const express=require('express');
const app=express();
const {CreateTableContacts} = require('../DataBaseSchema/Contact_Schema');
const {getClient}=require('../DatabaseConnection');

app.use(express.json());

CreateTableContacts();

app.get("/",(req,res)=>{
    res.status(200).json({
        Message:"Server Is Running"
    }) 
});

app.post("/identify", async (req,res)=>{
    const email=req.body.email;
    const phoneNumber=req.body.phoneNumber;
    if(!email && !phoneNumber){
        res.status(400).json({ error: "Email or Phone Number is required" });
        return;
    }
    const client=await getClient();
    try {
        const query = 'SELECT * FROM contacts WHERE email = $1 OR phoneNumber = $2';
        const values = [email, phoneNumber];
        const result = await client.query(query, values);
        if (result.rows.length > 0) {
            const resultRows=result.rows;
            if(resultRows.length==1){
                const currResultEmail=resultRows[0].email;
                const currResultPhoneNumber=resultRows[0].phonenumber;
                if(currResultEmail==email && currResultPhoneNumber==phoneNumber){
                    return res.status(200).json({
                        primaryContactId: resultRows[0].id,
                        emails: [email],
                        phoneNumbers:[phoneNumber],
                        secondaryContactIds:[]
                    })
                }
                if(currResultEmail!=email && phoneNumber!=null){
                    const insertQuery = `
                    INSERT INTO contacts (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
                    VALUES ($1, $2, NULL, 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt;
                    `;
                    const insertValues = [phoneNumber, email]; // With Same Phone Number but different mail
                    const insertResult = await client.query(insertQuery, insertValues);
                    const newContact = insertResult.rows[0];
                    return res.status(201).json({
                        contact: {
                            primaryContactId: resultRows[0].id,
                            emails: [ currResultEmail, newContact.email],
                            phoneNumbers: [newContact.phonenumber],
                            secondaryContactIds: [newContact.id]
                        }
                    });
                    
                }else if(phoneNumber!=currResultPhoneNumber && email!=null ){
                    const insertQuery = `
                    INSERT INTO contacts (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
                    VALUES ($1, $2, NULL, 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt;
                    `;
                    const insertValues = [phoneNumber, email]; // With Same Email but different Phone Number
                    const insertResult = await client.query(insertQuery, insertValues);
                    const newContact = insertResult.rows[0];
                    return res.status(201).json({
                        contact: {
                            primaryContactId: resultRows[0].id,
                            emails: [  newContact.email],
                            phoneNumbers: [currResultPhoneNumber, newContact.phonenumber],
                            secondaryContactIds: [newContact.id]
                        }
                    });
                    
                }
            }else {
                result.rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                const PrimaryContact=result.rows[0];
                const emails = new Set([result.rows[0].email]);
                const phoneNumbers = new Set([result.rows[0].phonenumber]);
                const secondaryContactIds=[];
                const TobeUpdated=[];
                for(let i=1;i<result.rows.length;i++){
                    if (result.rows[i].linkPrecedence === 'primary') {
                        TobeUpdated.push(result.rows[i].id);
                    } else {
                        emails.add(result.rows[i].email);
                        phoneNumbers.add(result.rows[i].phonenumber);
                        secondaryContactIds.push(result.rows[i].id);
                    }
                }
                if (TobeUpdated.length > 0) {
                    const updatePromises = TobeUpdated.map(id => {
                        const updateQuery = `
                        UPDATE contacts
                        SET linkPrecedence = 'secondary'
                        WHERE id = $1
                        RETURNING id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt;
                        `;
                        return client.query(updateQuery, [id]);
                    });

                    const updateResults = await Promise.all(updatePromises);
                    updateResults.forEach(updateResult => {
                        const updatedContact = updateResult.rows[0];
                        emails.add(updatedContact.email);
                        phoneNumbers.add(updatedContact.phonenumber);
                        secondaryContactIds.push(updatedContact.id);
                    });
                }
                return res.status(200).json({
                    contact: {
                        primaryContactId: PrimaryContact.id,
                        emails: [... emails],
                        phoneNumbers: [... phoneNumbers],
                        secondaryContactIds: secondaryContactIds
                    }
                });
            }
            return  res.status(200).json(result.rows);
        } else {
            const insertQuery = `
                INSERT INTO contacts (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
                VALUES ($1, $2, NULL, 'primary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt;
            `;
            const insertValues = [phoneNumber, email];
            const insertResult = await client.query(insertQuery, insertValues);
            const newContact = insertResult.rows[0];
            res.status(201).json({
                contact: {
                    primaryContactId: newContact.id,
                    emails: [newContact.email],
                    phoneNumbers: [newContact.phonenumber],
                    secondaryContactIds: []
                }
            });
        }
    } catch (error) {
        console.error('Error executing query', error.stack);
        res.status(500).json({ error: "Internal Server Error" });
    } finally{
        await client.end();
    }
})

var port=3000

app.listen(port,()=>{
    console.log(`Server running in port:- ${port}`);
})

