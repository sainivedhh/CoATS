import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

# Super simple static dataset covering major keywords for Indian Penal Code offenses
TRAINING_DATA = [
    # Minor offenses (Traffic, Nuisance, Petty Theft)
    ("IPC 279 rash driving negligence accident", "Minor"),
    ("IPC 283 danger obstruction public way", "Minor"),
    ("IPC 290 public nuisance", "Minor"),
    ("IPC 294 obscene acts songs", "Minor"),
    ("IPC 336 act endangering life safety", "Minor"),
    ("IPC 341 wrongful restraint", "Minor"),
    ("IPC 510 intoxication public misconduct", "Minor"),
    ("petty traffic violation speeding", "Minor"),

    # Bailable offenses (Cheating, Simple Hurt, Forgery)
    ("IPC 323 voluntary causing hurt simple", "Bailable"),
    ("IPC 379 theft of property stolen pickpocket", "Bailable"),
    ("IPC 420 cheating fraud deception cybercrime", "Bailable"),
    ("IPC 406 criminal breach of trust", "Bailable"),
    ("IPC 468 forgery for cheating fake documents", "Bailable"),
    ("IPC 504 intentional insult breach of peace", "Bailable"),
    ("IPC 506 criminal intimidation threat", "Bailable"),
    ("financial fraud embezzlement", "Bailable"),

    # Non-Bailable offenses (Murder, Rape, Robbery, Grievous Hurt)
    ("IPC 302 murder culpable homicide killing", "Non-Bailable"),
    ("IPC 307 attempt to murder", "Non-Bailable"),
    ("IPC 326 grievous hurt by dangerous weapons", "Non-Bailable"),
    ("IPC 376 rape sexual assault violation", "Non-Bailable"),
    ("IPC 392 robbery snatching mugging", "Non-Bailable"),
    ("IPC 395 dacoity armed robbery gang", "Non-Bailable"),
    ("IPC 396 dacoity with murder", "Non-Bailable"),
    ("IPC 498A cruelty domestic violence dowry", "Non-Bailable"),

    # Heinous offenses (Terrorism, Gang Rape, Waging War against State)
    ("IPC 120B criminal conspiracy terrorism plot", "Heinous"),
    ("IPC 121 waging war against government state armed rebellion", "Heinous"),
    ("IPC 302 r/w 120B assassination terror plot supreme court", "Heinous"),
    ("IPC 364A kidnapping for ransom hostage", "Heinous"),
    ("IPC 376A rape causing death vegetative state brutal", "Heinous"),
    ("IPC 376D gang rape brutal assault", "Heinous"),
    ("UAPA terrorism unlawful activities extreme violence", "Heinous"),
    ("explosives act bomb blast terror attack", "Heinous"),
]

# Separate features (X) and labels (y)
X_train = [item[0] for item in TRAINING_DATA]
y_train = [item[1] for item in TRAINING_DATA]

# Build a simple NLP pipeline (TF-IDF + Naive Bayes)
# This will be trained in-memory instantly when the Django app starts
ai_model = make_pipeline(TfidfVectorizer(ngram_range=(1, 2)), MultinomialNB())
ai_model.fit(X_train, y_train)

def predict_severity(crime_description: str) -> tuple[str, int]:
    """
    Predicts the severity of an unknown IPC section or crime description
    using the locally trained Scikit-Learn NLP model.
    Returns: (predicted_severity, confidence_percentage)
    """
    if not crime_description or not isinstance(crime_description, str):
        return "Non-Bailable", 0  # Safe default fallback
        
    # Basic text cleaning (lowercase, remove special chars)
    clean_text = re.sub(r'[^a-zA-Z0-9\s]', ' ', crime_description).lower()
    
    # Predict using the loaded model
    prediction = ai_model.predict([clean_text])[0]
    
    # Extract Confidence Probability
    try:
        probs = ai_model.predict_proba([clean_text])[0]
        class_idx = list(ai_model.classes_).index(prediction)
        confidence = int(probs[class_idx] * 100)
    except:
        confidence = 50
        
    return str(prediction), confidence


def compute_similar_cases(target_id: str, corpus_data: list, top_n: int = 3) -> list:
    """
    corpus_data: [{"id": "uuid1", "text": "gist..."}, ...]
    Returns: [{"id": "uuid2", "match_score": 85}, ...]
    """
    if len(corpus_data) < 2:
        return []
        
    target_idx = next((i for i, item in enumerate(corpus_data) if str(item["id"]) == str(target_id)), None)
    if target_idx is None:
        return []
        
    texts = [item["text"] for item in corpus_data]
    vec = TfidfVectorizer(stop_words="english")
    
    try:
        tfidf_matrix = vec.fit_transform(texts)
    except:
        return []
        
    # Compute similarity between target and all others
    cos_sim = cosine_similarity(tfidf_matrix[target_idx:target_idx+1], tfidf_matrix).flatten()
    
    # Sort indices by score descending, excluding the target itself
    related_indices = cos_sim.argsort()[::-1]
    
    results = []
    for idx in related_indices:
        if idx == target_idx:
            continue
        match_score = int(cos_sim[idx] * 100)
        
        # Only suggest meaningful algorithmic matches
        if match_score > 0:
            results.append({
                "id": corpus_data[idx]["id"],
                "match_score": match_score
            })
            
        if len(results) >= top_n:
            break
            
    return results
