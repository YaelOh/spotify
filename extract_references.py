import spacy
import sys
import json

def extract_references(text):
    nlp = spacy.load("en_core_web_sm")
    doc = nlp(text)
    references = [ent.text for ent in doc.ents if ent.label_ in {"PERSON", "WORK_OF_ART", "ORG"}]
    return references

if __name__ == "__main__":
    input_text = sys.stdin.read()
    references = extract_references(input_text)
    print(json.dumps(references))