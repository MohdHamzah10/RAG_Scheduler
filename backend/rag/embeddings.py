#import numpy as np
#from openai import OpenAI
#from config import OPENAI_API_KEY

#client = OpenAI(api_key=OPENAI_API_KEY)

#def get_embedding(text):
#    response = client.embeddings.create(
#        model="text-embedding-3-small",
#        input=text
#    )
#    return response.data[0].embedding

#def get_embedding(text):
#    return np.random.rand(384).astype("float32")

from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embedding(text):
    return model.encode(text).astype("float32")

if __name__ == "__main__":
    emb = model.encode("test")
    print("Shape:", emb.shape)