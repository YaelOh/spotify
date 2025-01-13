import spacy
import sys
import json

def extract_references(text):
    nlp = spacy.load("en_core_web_sm")
    doc = nlp(text)
    references = {"books": [], "people": [], "others": []}

    for ent in doc.ents:
        if ent.label_ == "PERSON":
            references["people"].append({
                "text": ent.text,
                "snippet": get_snippet(text, ent.start_char, ent.end_char),
                "timestamp": "N/A"  # Placeholder since no timestamp data is available
            })
        elif ent.label_ == "WORK_OF_ART":
            references["books"].append({
                "text": ent.text,
                "snippet": get_snippet(text, ent.start_char, ent.end_char),
                "timestamp": "N/A"  # Placeholder since no timestamp data is available
            })
        else:
            references["others"].append({
                "text": ent.text,
                "snippet": get_snippet(text, ent.start_char, ent.end_char),
                "timestamp": "N/A"  # Placeholder since no timestamp data is available
            })

    return references

def get_snippet(text, start, end, window=30):
    """Get a snippet of the text around the entity."""
    snippet_start = max(0, start - window)
    snippet_end = min(len(text), end + window)
    return text[snippet_start:snippet_end].strip()

if __name__ == "__main__":
    input_text = sys.stdin.read()
    references = extract_references(input_text)
    print(json.dumps(references))