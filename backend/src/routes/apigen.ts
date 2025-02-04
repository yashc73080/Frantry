import dotenv from 'dotenv';
import { response } from 'express';
// import { MongoClient } from 'mongodb';

dotenv.config({ path: './.env' });
const api = process.env.OPENROUTER_API_KEY;
const server = process.env.SERVER_URL;
// console.log(api);


const uri = `${process.env.MONGO_URI}`;
// const client = new MongoClient(uri);
let high = "";
let medium = "";
let low = "";

async function run() {
  try {
      high = "";
    medium = "";
    low = "";
    // await client.connect();
    // const db = client.db("test");
    // const col = db.collection("items");
    
    
    const response = await fetch(`${process.env.SERVER_URL}}/api/items/getAllItems`, {
      method: "GET",
    });

    const data = await response.json();
    // console.log(data);
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
    // console.log(response);
  }
}



const getRecipe = async () => {
  try {
    const p = await run()
    // console.log(`The lists are High: ${high}, Med: ${medium}, Low: ${low}`);
    const req  = `Make a tasty, delicious,popular recipe that prioritizes at least one of the following ingredients: ${high}. Most of the remaining ingredients must come from the following: ${medium}, ${low}. Limit 200 words. No extra comments. Enumerate the steps.`;
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
    if (!data.choices){
      console.error('Error: DATA', data);
      return ;
    }
    const reply = data.choices[0].message.content;
    if (!reply){
      console.log(data);
    }
    return reply;
    console.log('Output: ', reply);
  } catch (error) {
    // console.error('Error:', error);
  }
  
  
};

export default async function sendRecipe() {
  try {
      // Fetch recipe text
      const reply = await getRecipe();
      console.log(`REPLY: ${reply}`);

      if (!reply) {
          throw new Error("Empty recipe received");
      }

      // Wrap the response in a JSON object
      const jsonObject = { recipe: reply };

      var title;
      var  content;
      // Extract title (first line surrounded by **)
      const match = reply.match(/\*\*(.*?)\*\*/);
      if (!match) {
         title = '**Recipe**';
         content = reply;
      }
      else {
        title = match[0].replace(/\*/g, '').trim(); // Remove '**' from title
        content = reply.split(match[0])[1]?.trim() || "No content available";
      }
      
      

      // Final structured object
      const formattedRecipe = {
          title,
          content,
          raw: jsonObject // Keep raw response for debugging if needed
      };

      console.log("Parsed Recipe:", formattedRecipe);
      return formattedRecipe;
  } catch (error) {
      console.error("Error processing recipe:", error);
      return { title: "Error", content: "Could not extract recipe" };
  }
}

// const sendRecipe = async () => {
//   const reply = await getRecipe();
//   const json = `{"recipe": "${reply}"}`;
//   console.log(reply);
//   const fix = JSON.stringify(json);
//   return JSON.parse(fix);
// }

// export default sendRecipe ;