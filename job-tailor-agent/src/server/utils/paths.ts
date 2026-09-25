import path from "path"

// process.cwd() = current working directory
// DATA_DIR = C:\Users\dev\Desktop\GenAi-Cohort\job-tailor-agent\data
export const DATA_DIR = path.join(process.cwd(), "data");

// "C:\\Users\\dev\\Desktop\\GenAi-Cohort\\job-tailor-agent\\output"
export const OUTPUT_DIR = path.join(process.cwd(), "output");