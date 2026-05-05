import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export async function indexTheDocument(filePath) {
    // PDFLoader ka instance banaya ja raha hai.
    // { splitPages: false } ka matlab hai ke poori PDF ka text aik hi 'pageContent' mein aayega.
    // Agar ye 'true' hota (jo default hai), to har page ka alag array element banta.
    const loader = new PDFLoader(filePath, { splitPages: false });

    // load() method file ko read karta hai aur asynchronous operation perform karta hai.
    // Ye aik array return karega jisme sirf AIK (1) Document object hoga.
    const doc = await loader.load();

    console.log(doc[0].pageContent);
}
