import http.server
import socketserver
import json
from transformers import BertForSequenceClassification, BertTokenizer
import torch

# Carica il modello e il tokenizer
model_name = "mrm8488/bert2bert"
model = BertForSequenceClassification.from_pretrained(model_name)
tokenizer = BertTokenizer.from_pretrained(model_name)

# Se necessario, aggiungi il tuo token API qui
api_token = "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"  # Sostituisci con il tuo token API se necessario

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/define':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            parola = data.get('word', '')

            # Modifica il prompt per richiedere una definizione in massimo 3 righe
            input_text = f"Definisci in massimo 3 righe: '{parola}'"
            inputs = tokenizer(input_text, return_tensors="pt")

            with torch.no_grad():
                outputs = model(**inputs)

            generated_ids = outputs[0].argmax(dim=-1)
            definition = tokenizer.decode(generated_ids[0], skip_special_tokens=True)

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'definition': definition}
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

PORT = 8000

with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()