import os
import json
import base64
import hashlib
import urllib.request
import urllib.error
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static', template_folder='templates')

# Load .env file safely if present
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

SARVAM_API_KEY = os.environ.get('SARVAM_API_KEY', '')
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'static', 'sounds', 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

# Language configurations
LANGUAGE_CONFIGS = {
    'hi-IN': {
        'name': 'Hindi (हिंदी)',
        'region': 'Rajasthan Haveli',
        'ghost_name': 'रानी रूपमती (Rani Roopmati)',
        'speaker': 'roopa',
        'intro_text': 'कौन है... जो इस वीरान हवेली की चौखट लांघने का दुस्साहस कर रहा है? बोलो... यहाँ अपनी मौत ढूंढने आए हो, या मेरे सवालों का उत्तर देने?',
        'intro_translation': 'Who dares to cross the threshold of this desolate haveli? Speak... have you come seeking your death, or to answer my riddles?',
        'intro_audio': '/static/sounds/ghost_intro_hi.wav',
        'riddles': [
            {
                'id': 1,
                'target': 'दर्पण / आईना (Mirror)',
                'keywords': ['दर्पण', 'आईना', 'शीशा', 'mirror', 'aaina', 'darpan', 'shisha'],
                'clue_title': 'पहला रहस्य: टूटा दर्पण (The Shattered Mirror)'
            },
            {
                'id': 2,
                'target': 'घुंघरू / पायल (Anklet Bells)',
                'keywords': ['घुंघरू', 'पायल', 'नूपुर', 'ghungroo', 'payal', 'bells', 'anklet'],
                'clue_title': 'दूसरा रहस्य: मौन घुंघरू (The Silent Ghungroos)'
            },
            {
                'id': 3,
                'target': 'हार / क्षमा / मुक्ति (The Royal Necklace / Forgiveness)',
                'keywords': ['हार', 'क्षमा', 'मुक्ति', 'शांति', 'necklace', 'forgiveness', 'peace', 'mukti', 'shanti'],
                'clue_title': 'अंतिम रहस्य: आत्मा की मुक्ति (Freedom of the Soul)'
            }
        ]
    },
    'bn-IN': {
        'name': 'Bengali (বাংলা)',
        'region': 'Bengal Rajbari',
        'ghost_name': 'জমিদার গিন্নী ভবতারিণী (Zamindarni Bhabatarini)',
        'speaker': 'priya',
        'intro_text': 'কে... এই পোড়ো রাজবাড়ির চৌকাঠে পা রাখার দুঃসাহস করেছে? বলো... নিজের মৃত্যু খুঁজতে এসেছ, নাকি আমার ধাঁধার উত্তর দেবে?',
        'intro_translation': 'Who has dared to step onto the threshold of this ruined Rajbari? Speak... have you come seeking death, or to solve my riddles?',
        'intro_audio': '/static/sounds/ghost_intro_bn.wav',
        'riddles': [
            {
                'id': 1,
                'target': 'আয়না / দর্পণ (Mirror)',
                'keywords': ['আয়না', 'দর্পণ', 'mirror', 'ayna', 'darpan'],
                'clue_title': 'প্রথম রহস্য: রক্তমাখা আয়না (Bloodstained Mirror)'
            },
            {
                'id': 2,
                'target': 'নুপুর / মল (Anklet Bells)',
                'keywords': ['নুপুর', 'পায়েল', 'নূপুর', 'nupur', 'bells', 'ghungroo'],
                'clue_title': 'দ্বিতীয় রহস্য: নিস্তব্ধ নূপুর (Silent Anklets)'
            },
            {
                'id': 3,
                'target': 'মুক্তি / ক্ষমা (Salvation / Forgiveness)',
                'keywords': ['মুক্তি', 'ক্ষমা', 'শান্তি', 'mukti', 'peace', 'shanti'],
                'clue_title': 'চূড়ান্ত রহস্য: অতৃপ্ত আত্মার মুক্তি (Salvation of the Trapped Soul)'
            }
        ]
    },
    'mr-IN': {
        'name': 'Marathi (मराठी)',
        'region': 'Pune Peshwa Wada',
        'ghost_name': 'वाड्याची सुनबाई (Wada Sunbai)',
        'speaker': 'roopa',
        'intro_text': 'कोण आहे तिथे? या जुन्या वाड्यात येण्याचं धाडस कोणाचं झालं? बोला... माझ्या प्रश्नांची उत्तरं द्यायला आला आहात की आपला जीव गमावायला?',
        'intro_translation': 'Who is there? Who dared enter this ancient Wada? Speak... have you come to answer my riddles or lose your life?',
        'intro_audio': None,
        'riddles': [
            {
                'id': 1,
                'target': 'आरसा (Mirror)',
                'keywords': ['आरसा', 'दर्पण', 'aarsa', 'mirror'],
                'clue_title': 'पहिले रहस्य: जुना आरसा (Antique Mirror)'
            },
            {
                'id': 2,
                'target': 'पैंजण / घुंगरू (Anklets)',
                'keywords': ['पैंजण', 'घुंगरू', 'painjan', 'ghungroo'],
                'clue_title': 'दुसरे रहस्य: मौन पैंजण (Silent Anklets)'
            },
            {
                'id': 3,
                'target': 'मुक्ती / क्षमा (Salvation)',
                'keywords': ['मुक्ती', 'क्षमा', 'शांती', 'mukti', 'peace'],
                'clue_title': 'अंतिम रहस्य: आत्म्याची मुक्ती (Liberation)'
            }
        ]
    }
}

def generate_sarvam_tts(text: str, lang_code: str = 'hi-IN', anger_level: int = 50) -> str:
    """
    Generates TTS audio using Sarvam AI Bulbul:v3.
    Modulates pitch and pace based on anger level.
    Returns URL path to cached WAV file or base64 data.
    """
    if not text:
        return ""
    
    # Hash request for caching
    config = LANGUAGE_CONFIGS.get(lang_code, LANGUAGE_CONFIGS['hi-IN'])
    speaker = config.get('speaker', 'roopa')
    
    # Anger determines vocal distortion and pitch
    # Calm (0-30): Eerie low whisper, slower pace
    # Medium (31-70): Cryptic hollow tone
    # Raging (71-100): Booming harsh pitch, faster, loud
    if anger_level < 30:
        pitch = -0.15
        pace = 0.80
        loudness = 0.95
    elif anger_level < 70:
        pitch = -0.30
        pace = 0.85
        loudness = 1.15
    else:
        pitch = -0.45
        pace = 1.02
        loudness = 1.40
        
    cache_key = hashlib.md5(f"{text}_{lang_code}_{speaker}_{pitch:.2f}_{pace:.2f}".encode('utf-8')).hexdigest()
    cache_filename = f"tts_{cache_key}.wav"
    cache_filepath = os.path.join(CACHE_DIR, cache_filename)
    
    if os.path.exists(cache_filepath) and os.path.getsize(cache_filepath) > 1000:
        return f"/static/sounds/cache/{cache_filename}"
        
    try:
        req = urllib.request.Request(
            'https://api.sarvam.ai/text-to-speech',
            headers={
                'api-subscription-key': SARVAM_API_KEY,
                'Content-Type': 'application/json'
            },
            data=json.dumps({
                'inputs': [text],
                'target_language_code': lang_code,
                'speaker': speaker,
                'pitch': pitch,
                'pace': pace,
                'loudness': loudness,
                'speech_sample_rate': 22050,
                'enable_preprocessing': True,
                'model': 'bulbul:v3'
            }).encode('utf-8'),
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'audios' in data and len(data['audios']) > 0:
                audio_bytes = base64.b64decode(data['audios'][0])
                with open(cache_filepath, 'wb') as cf:
                    cf.write(audio_bytes)
                return f"/static/sounds/cache/{cache_filename}"
    except Exception as e:
        print(f"Sarvam TTS Error: {e}")
        
    return ""

def call_sarvam_llm(messages: list) -> dict:
    """
    Calls Sarvam-105b LLM with the provided message history.
    Returns parsed JSON dict or fallback.
    """
    try:
        req = urllib.request.Request(
            'https://api.sarvam.ai/v1/chat/completions',
            headers={
                'api-subscription-key': SARVAM_API_KEY,
                'Content-Type': 'application/json'
            },
            data=json.dumps({
                'model': 'sarvam-105b',
                'messages': messages,
                'temperature': 0.7,
                'max_tokens': 350
            }).encode('utf-8'),
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            content = result['choices'][0]['message']['content'].strip()
            
            # Find JSON block if wrapped
            if '{' in content and '}' in content:
                json_str = content[content.find('{'):content.rfind('}')+1]
                return json.loads(json_str)
            return json.loads(content)
    except Exception as e:
        print(f"Sarvam LLM Error: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html', languages=LANGUAGE_CONFIGS)

@app.route('/api/initial-state', methods=['GET'])
def initial_state():
    lang = request.args.get('lang', 'hi-IN')
    if lang not in LANGUAGE_CONFIGS:
        lang = 'hi-IN'
        
    cfg = LANGUAGE_CONFIGS[lang]
    intro_audio = cfg.get('intro_audio')
    if not intro_audio:
        intro_audio = generate_sarvam_tts(cfg['intro_text'], lang, anger_level=45)
        
    return jsonify({
        'status': 'success',
        'lang': lang,
        'ghost_name': cfg['ghost_name'],
        'region': cfg['region'],
        'anger': 40,
        'dialogue': cfg['intro_text'],
        'translation': cfg['intro_translation'],
        'audio_url': intro_audio,
        'reaction': 'cryptic',
        'solved_riddles': [],
        'current_riddle_index': 0,
        'total_riddles': 3,
        'riddle_hint': 'दर्पण / आईना (Look for what reflects without eyes)'
    })

@app.route('/api/interact', methods=['POST'])
def interact():
    data = request.get_json() or {}
    user_text = data.get('text', '').strip()
    lang = data.get('lang', 'hi-IN')
    current_anger = int(data.get('anger', 40))
    solved_riddles = data.get('solved_riddles', [])
    current_riddle_idx = int(data.get('current_riddle_index', 0))
    
    if lang not in LANGUAGE_CONFIGS:
        lang = 'hi-IN'
    cfg = LANGUAGE_CONFIGS[lang]
    
    if not user_text:
        return jsonify({'status': 'error', 'message': 'No text provided'}), 400

    # Check riddle solutions
    riddles = cfg['riddles']
    is_riddle_solved = False
    just_solved_id = None
    
    if current_riddle_idx < len(riddles):
        target_riddle = riddles[current_riddle_idx]
        user_lower = user_text.lower()
        for kw in target_riddle['keywords']:
            if kw.lower() in user_lower:
                is_riddle_solved = True
                just_solved_id = target_riddle['id']
                if just_solved_id not in solved_riddles:
                    solved_riddles.append(just_solved_id)
                current_riddle_idx += 1
                break

    # Build system prompt for Sarvam-105b
    system_prompt = f"""You are the vengeful, tragic ghost '{cfg['ghost_name']}' trapped inside the {cfg['region']}.
You speak ONLY in evocative, haunting, archaic {cfg['name']}. You speak in enigmatic riddles, dropping clues about your death and the haveli's secrets.

Current Game Context:
- Ghost Anger Level: {current_anger}/100 (0=Peaceful/liberated spirit, 50=Suspicious & dangerous, 100=Enraged demon)
- Riddles Solved So Far: {len(solved_riddles)} of 3.
- Riddle Just Solved by Mortal: {is_riddle_solved} (Riddle #{just_solved_id if is_riddle_solved else 'None'})

Rules for Ghost's Personality:
1. You MUST speak STRICTLY in {cfg['name']} (regional dialect). Never speak English in the dialogue field!
2. Keep the dialogue poetic, mysterious, spine-chilling (1-3 short haunting sentences).
3. Judge the mortal's voice message:
   - If they are respectful, reverent, humble, or solved your riddle: your anger decreases (anger_delta: -15 to -30).
   - If they are arrogant, mocking, yelling, skeptical, or rude: your anger explodes (anger_delta: +20 to +40).
   - If they are fearful, confused, or inquiring: slight change (anger_delta: -5 to +10).
4. Drop clues in riddles:
   - Clue 1: A broken mirror that reflects souls.
   - Clue 2: Bloodstained ghungroos (anklet bells) silenced in the dark.
   - Clue 3: Freedom through forgiveness or finding her lost royal locket.
5. If anger reaches 100, become furious, threaten their soul!
6. If all 3 riddles solved, become tearfully peaceful, offering your blessing before vanishing.

Return ONLY raw JSON with this exact schema:
{{
  "dialogue": "Short ghostly dialogue strictly in {cfg['name']}",
  "translation": "English translation for subtitles",
  "anger_delta": integer between -35 and +40,
  "ghost_reaction": "appeased" | "cryptic" | "suspicious" | "furious" | "wrathful" | "liberated",
  "flicker_intensity": integer 1 to 5,
  "clue_text": "Cryptic hint for the next secret",
  "ghost_visual": "calm_veil" | "shadow_eyes" | "screaming_apparition" | "ethereal_light"
}}"""

    llm_messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': f"The mortal visitor says to you by voice: '{user_text}'"}
    ]

    llm_res = call_sarvam_llm(llm_messages)
    
    # Fallback if LLM times out or gives invalid JSON
    if not llm_res or 'dialogue' not in llm_res:
        # Heuristic fallback
        respect_words = ['प्रणाम', 'नमस्कार', 'रानी', 'माफ', 'क्षमा', 'शांति', 'मदद', 'please', 'respect', 'peace', 'নমস্কার', 'ক্ষমা']
        insult_words = ['चुप', 'पागल', 'भाग', 'बकवास', 'झूठ', 'मर', 'stupid', 'fake', 'shut up', 'get lost', 'পাগল', 'পালা']
        
        user_lower = user_text.lower()
        is_respectful = any(w in user_lower for w in respect_words)
        is_insulting = any(w in user_lower for w in insult_words)
        
        if is_riddle_solved:
            delta = -25
            reaction = 'appeased'
            if lang == 'bn-IN':
                dial = 'তুমি সত্য দর্শন করেছ... কিন্তু রক্তের দাগ তো এখনও আয়নায় লেগে আছে!'
                trans = 'You have seen the truth... but the bloodstains still cling to the mirror!'
            else:
                dial = 'तुमने सच को पहचान लिया... पर क्या अंधेरे में इस हवेली की दीवारों के पीछे दबे राज़ सुन पाओगे?'
                trans = 'You have recognized the truth... but can you hear the secrets buried behind the walls of this haveli?'
            visual = 'shadow_eyes'
            flicker = 2
        elif is_insulting:
            delta = 35
            reaction = 'furious'
            if lang == 'bn-IN':
                dial = 'তোমার এত বড় দুঃসাহস! এই ধ্বংসস্তূপেই তোমার সমাধি হবে!'
                trans = 'How dare you! Your tomb will be right here in these ruins!'
            else:
                dial = 'तुझे अपनी नश्वर सांसों का घमंड है? इस हवेली के तहखाने में तेरी चीखें सुनने वाला भी कोई नहीं होगा!'
                trans = 'Are you proud of your mortal breath? In the cellar of this haveli, no one will even hear your screams!'
            visual = 'screaming_apparition'
            flicker = 5
        elif is_respectful:
            delta = -15
            reaction = 'cryptic'
            if lang == 'bn-IN':
                dial = 'তোমার কণ্ঠে সম্মান আছে... কিন্তু এই পুরানো পাপ কি এত সহজে মোছা যায়?'
                trans = 'There is respect in your voice... but can ancient sins be wiped away so easily?'
            else:
                dial = 'तेरी आवाज़ में विनम्रता है... पर क्या तू मेरी अधूरी दास्तान सुनने का कलेजा रखता है?'
                trans = 'There is humility in your voice... but do you have the heart to listen to my unfinished tale?'
            visual = 'calm_veil'
            flicker = 2
        else:
            delta = 10
            reaction = 'suspicious'
            if lang == 'bn-IN':
                dial = 'অর্থহীন কথা বলো না! আমার ধাঁধার উত্তর দাও, নইলে বাতাস বরফ হয়ে যাবে!'
                trans = 'Do not speak meaningless words! Answer my riddle, or the air shall turn to ice!'
            else:
                dial = 'व्यर्थ के शब्द मत बोलो! उस वस्तु का नाम बताओ जो बिना आँखों के सारा सच दिखाती है!'
                trans = 'Do not waste words! Name that which reveals all truth without having any eyes!'
            visual = 'shadow_eyes'
            flicker = 3
            
        llm_res = {
            'dialogue': dial,
            'translation': trans,
            'anger_delta': delta,
            'ghost_reaction': reaction,
            'flicker_intensity': flicker,
            'clue_text': 'Look closer at the antique glass upon the stone wall...',
            'ghost_visual': visual
        }

    # Calculate new anger
    delta = int(llm_res.get('anger_delta', 0))
    new_anger = max(0, min(100, current_anger + delta))
    
    # Check win/gameover condition
    all_solved = len(solved_riddles) >= 3
    is_game_over = new_anger >= 100
    is_victory = all_solved and new_anger < 40
    
    if is_victory:
        llm_res['ghost_visual'] = 'ethereal_light'
        llm_res['ghost_reaction'] = 'liberated'
    elif is_game_over:
        llm_res['ghost_visual'] = 'screaming_apparition'
        llm_res['ghost_reaction'] = 'wrathful'
    
    # Generate TTS voice audio for the ghost's response
    audio_url = generate_sarvam_tts(
        llm_res.get('dialogue', ''),
        lang_code=lang,
        anger_level=new_anger
    )
    
    return jsonify({
        'status': 'success',
        'dialogue': llm_res.get('dialogue', ''),
        'translation': llm_res.get('translation', ''),
        'anger': new_anger,
        'anger_delta': delta,
        'ghost_reaction': llm_res.get('ghost_reaction', 'cryptic'),
        'ghost_visual': llm_res.get('ghost_visual', 'shadow_eyes'),
        'flicker_intensity': llm_res.get('flicker_intensity', 3),
        'clue_text': llm_res.get('clue_text', ''),
        'audio_url': audio_url,
        'solved_riddles': solved_riddles,
        'current_riddle_index': current_riddle_idx,
        'is_riddle_solved': is_riddle_solved,
        'is_game_over': is_game_over,
        'is_victory': is_victory
    })

@app.route('/api/speak', methods=['POST'])
def speak():
    data = request.get_json() or {}
    text = data.get('text', '')
    lang = data.get('lang', 'hi-IN')
    anger = int(data.get('anger', 50))
    audio_url = generate_sarvam_tts(text, lang, anger)
    return jsonify({'status': 'success', 'audio_url': audio_url})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Haunted Haveli starting on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
