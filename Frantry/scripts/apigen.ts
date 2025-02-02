import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: './.env.local' });
const api = process.env.OPENROUTER_API_KEY;

const uri = `${process.env.MONGO_URI}`;
const client = new MongoClient(uri);
let high = "";
let medium = "";
let low = "";

async function run() {
  try {
    await client.connect();
    const db = client.db("test");
    const col = db.collection("items");
    
    
    const response = await fetch("http://10.74.126.23:5000/api/items/", {
      method: "GET",
    });

    const data = await response.json();
    console.log(data);
    for (const index in data) {
      const food = data[index];
      if (food.expiryLevel == "high") {
        high += food.name + " ";
      }
      else if (food.expiryLevel == "medium") {
        medium += food.name + " ";
      }
      else {
        low += food.name + " ";
      }
      
    }
  }
  finally {
    await client.close();
  }
}



const getRecipe = async () => {
  try {
    const p = await run().catch(console.dir);
    console.log(`The lists are High: ${high}, Med: ${medium}, Low: ${low}`);
    const req  = `Make a popular recipe that prioritizes at least one of the following ingredients: ${high}. Most of the remaining ingredients must come from the following: ${medium}, ${low}. Limit 200 words. No extra comments. Enumerate the steps.`;
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${api}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-3.2-3b-instruct:free",
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": req
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid response structure: ', data);
      return;
    }
    const reply = data.choices[0].message.content;
    return reply;
    console.log('Output: ', reply);
  } catch (error) {
    console.error('Error:', error);
  }
  
  
};

const sendRecipe = async () => {
  const reply = await getRecipe();
  const json = `{"recipe": "${reply}"}`;
  console.log(reply);
  const fix = JSON.stringify(json);
  return JSON.parse(fix);
}
