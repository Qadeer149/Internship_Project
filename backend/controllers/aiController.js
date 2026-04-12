import { GoogleGenAI } from '@google/genai';
import { getStoredData } from './uploadController.js';
import { groupBySum, getTopN, filterData } from '../utils/dataProcessor.js';

export const askAI = async (req, res) => {
  try {
    const { question } = req.body;
    
    // 1️⃣ Grab the in-memory data that was just uploaded (or fetched securely from MongoDB)
    const data = await getStoredData();

    if (!data || data.length === 0) {
      return res.status(400).json({ error: "Please upload a CSV file first." });
    }

    // 2️⃣ Get the columns from our CSV to give the AI context
    const columns = Object.keys(data[0]);

    // 3️⃣ Initialize Gemini 3.0 Pro SDK
    // Important: You must have GEMINI_API_KEY in your backend/.env file
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 4️⃣ Craft the precise prompt for the LLM
    const prompt = `
      You are a brilliant AI Data Analyst. I have a dataset with these exact columns: ${columns.join(", ")}.
      The user asked: "${question}"

      Based on their request, return a strict JSON object (NO extra text, NO markdown) to control my query engine.
      
      CRITICAL INSTRUCTIONS FOR CHARTING:
      Your output must ALWAYS include an 'xAxis', 'yAxis', and 'chartType' property. 
      - The 'xAxis' MUST be a categorical/name/date column (e.g., Customer Name, Product, Month). NEVER use an ID.
      - The 'yAxis' MUST be the exact numeric column the user wants to measure (e.g., Sales, Amount, Revenue). NEVER use a Date, ID, or categorical column for the yAxis.
      - The 'chartType' MUST be "bar", "line", or "pie". Use "line" for trends over time, "pie" for composition/percentages of small groups, and "bar" for comparing different categories.
      
      Option 1 (Find Top N records):
      { "type": "top", "yAxis": "exact_numeric_column_name", "xAxis": "exact_categorical_column_name", "chartType": "bar", "limit": 5 }
      
      Option 2 (Group totals by a field):
      { "type": "group", "xAxis": "exact_grouping_column_name", "yAxis": "exact_numeric_column_name", "chartType": "pie" }

      Option 3 (Filter data, e.g., 'price under 500rs', 'sales > 2000', 'name is John'):
      { "type": "filter", "xAxis": "exact_categorical_column_name", "yAxis": "exact_numeric_column_name", "chartType": "bar", "filterField": "exact_column_to_filter", "filterOperator": "<", "filterValue": 500 }
      // Allowed filterOperators: "=", ">", "<", ">=", "<=", "includes"

      Output the JSON only. No formatting tricks.
    `;

    console.log("🤔 Asking Gemini AI...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using Gemini 2.5 Flash as it is fully supported by your API key version
      contents: prompt,
    });

    const aiText = response.text;
    
    // 5️⃣ Parse the JSON coming back from Gemini
    const cleanedText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    const command = JSON.parse(cleanedText);
    console.log("✨ Gemini translated into:", command);

    let result = [];
    
    // 6️⃣ Execute the operation mapped by Gemini using the new xAxis/yAxis structure
    if (command.type === "group") {
      result = groupBySum(data, command.xAxis, command.yAxis);
    } else if (command.type === "top") {
      result = getTopN(data, command.yAxis, command.limit || 5);
    } else if (command.type === "filter") {
      result = filterData(data, command.filterField, command.filterOperator || "=", command.filterValue);
    } else {
      return res.status(400).json({ error: "AI couldn't map the query to a supported operation." });
    }

    // 7️⃣ We will attach the AI's exact chosen axes so the frontend chart knows exactly what to plot!
    res.json({ 
      result, 
      axes: { x: command.xAxis, y: command.yAxis },
      chartType: command.chartType || "bar",
      insights: `I analyzed the ${command.type} records by mapping ${command.xAxis} against ${command.yAxis} using a ${command.chartType || 'bar'} chart.` 
    });

  } catch (err) {
    console.error("AI Controller Error:", err);
    res.status(500).json({ error: "Failed to communicate with AI.", details: err.message });
  }
};
