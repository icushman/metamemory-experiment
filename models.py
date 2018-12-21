#  This is backend code for running a metamemory experiment.
#  A full refactor would be advisable before using this for anything sensitive.
#  - Isaiah Cushman
# ---------------------------------------------------------------///
# Presents an experimental protocol inspired by {McGillivray, S., & Castel,
# A. D. (2011). Betting on memory leads to metacognitive improvement by younger 
# and older adults. Psychology and Aging.}
# Adapted directly from 



from __future__ import print_function
import sys
import os
import sqlite3
import collections
from flask import Flask, jsonify, render_template, request, g
import random
import math
from ast import literal_eval
import dropbox





app = Flask(__name__)

app.debug = True

is_live = os.environ.get('IS_HEROKU', None)

if is_live:
    DROPBOX_API_KEY = os.environ.get('DB_API_KEY')

else:
	with open('p.dropbox_api_key.txt','r') as dbapifile:
		for line in dbapifile:
			DROPBOX_API_KEY = line.rstrip()

def db_connect():
	try:
		conn = sqlite3.connect('example.db')
		return conn
	except Error as e:
		print(e)
	return None

def initialize_participant_table(researcher, participant):
	wordfile = 'static/wordlist.csv'
	conn = db_connect()
	c = conn.cursor()

	participant_num = int(participant)

	participant_blank = build_participant_blank(wordfile, researcher, participant)

	c.execute('''CREATE TABLE IF NOT EXISTS participant_data
             (researcher_name text, participant_id int, block int, word text, valence text, bet int, accuracy int)''')

	#print("I THINK THE VALUE OF PARTICIPANTS IS" + str(participant), file=sys.stderr)
	c.execute("SELECT participant_id FROM participant_data WHERE participant_id = ?", (participant_num,))
	records_check = c.fetchall()
	#print("I THINK THE records is" + str(records_check), file=sys.stderr)

	if len(records_check) > 1:
		conn.close()
		return False

	c.executemany('INSERT INTO participant_data VALUES (?,?,?,?,?,?,?)', participant_blank)
	#print("I THINK I added the records", file=sys.stderr)
	conn.commit()
	conn.close()
	return True


def fetchwords(participant, block):
	conn = db_connect()
	c = conn.cursor()
	c.execute("SELECT word FROM participant_data WHERE participant_id=? AND block=?", (participant, block))
	words = c.fetchall()
	conn.close()
	return words

@app.route('/')
def index():
    return render_template('setup.html')


@app.route('/begin_session')
def setup():
	#dbhandler()
	researcher = request.args.get('researcher', 0, type=str)
	participant = request.args.get('participant', 0, type=str)
	e = request.args.get('demomode', 0, type=str)

	id_is_unique = initialize_participant_table(researcher, participant)

	c = fetchwords(participant,1)
	d = "is working"

	return jsonify(id_is_unique)

@app.route('/tutorial')
def tutorial():
    return render_template('tutorial.html')

@app.route('/test_loop')
def test_loop():
    return render_template('test_loop.html')

@app.route('/thank_you')
def thank_you():
    return render_template('thank_you.html')

@app.route('/return_block_wordlist')
def return_wordlist():
	participant = request.args.get('participant', 0, type=int)
	block = request.args.get('block', 0, type=int)
	print("I THINK YOU JUST ASKED FOR THE WORDS FROM BLOCK" + str(block), file=sys.stderr)
	wordlist = fetchwords(participant, block)
	keylist = [1,2,3,4,5,6,7,8,9,10,11,12]

	words_as_dict = list(zip(keylist,wordlist))

	print(wordlist, file=sys.stderr)
	return jsonify(wordlist)


@app.route('/score_calc')
def calculate_score():
	participant = request.args.get('participant', None, type=int)
	block = request.args.get('block', None, type=int)
	betlist = literal_eval(request.args.get('betlist', None, type=str))
	recalled = literal_eval(request.args.get('recalllist',None,type=str))

	print("BETLIST:" + str(betlist), file=sys.stderr)
	print('RECALLED:' + str(recalled), file=sys.stderr)
	print('BLOCK:' + str(block), file=sys.stderr)

	recalled = [x.lower() for x in recalled]

	betlist = [x.split(',') for x in betlist]
	wordlist = recover_words(betlist)
	betlist = process_bet_accuracy(betlist, recalled) #should obv be done w/ a class
	
	log_bets(participant, block, betlist)

	score = determine_block_score(betlist)
	#log_accuracy(recalled, wordlist)
	
	return jsonify(score)

def determine_block_score(betlist):
	score = 0
	for i in betlist:
		score += int(i[1])*int(i[2])
	return score


def process_bet_accuracy(betlist, recalled):
	ext_betlist = betlist
	print('ext_betlist' + str(len(ext_betlist)), file=sys.stderr)
	for betlist_index in range(len(ext_betlist)):

		if str(ext_betlist[betlist_index][0]) in recalled:

			ext_betlist[betlist_index].append(1)
		else:
			ext_betlist[betlist_index].append(-1)

	return ext_betlist

def recover_words(betlist):
	"""this is written in a ridiculous way because there are invisible integers at the
	end of the list? I may have put those there myself unwittingly, revisit this.
	The crummy method was used in a few places, just look for betlist_index
	"""
	words_observed = []
	for betlist_index in range(len(betlist)):
		words_observed.append(betlist[betlist_index][0])
	return words_observed

def log_bets(participant, block, betlist):
	conn = db_connect()
	c = conn.cursor()
	#print('betlist FOR LOGGING' + str(betlist), file=sys.stderr)
	for betlist_index in range(len(betlist)):
		word = betlist[betlist_index][0]
		bet = betlist[betlist_index][1]
		accuracy = betlist[betlist_index][2]
		c.execute("UPDATE participant_data SET bet = ?, accuracy = ? WHERE participant_id=? AND block=? AND word=?", (bet, accuracy, participant, block, word))

	conn.commit()
	conn.close()


@app.route('/recall_phase')
def recall_phase():
    return render_template('recall_phase.html')

@app.route('/score_screen')
def display_score():
    return render_template('score_screen.html')

@app.route('/save_database')
def save_database():
	try:
		dbx = dropbox.Dropbox(DROPBOX_API_KEY)
		send_file = app.open_resource('example.db','rb')
		dbx.files_upload(bytes(send_file.read()), '/database.db', mode=dropbox.files.WriteMode.overwrite)
		return jsonify('true')
	except:
		return jsonify('false')


#### TABLE MANIPULATION LOGIC ####

def record_bets():
	pass


def chunk_out_words(wordfile):

    bulkwords = app.open_resource(wordfile,'r')
    cond1 = []
    cond2 = []
    cond3 = []
    for line in bulkwords:
        linelist = [line]
        line = [x.strip() for x in line.split(',')]
        #print(line)
        cond1.append(line[0])
        cond2.append(line[1])
        cond3.append(line[2])
    return cond1,cond2,cond3

def build_random_block_from_list(list1,list2,list3, running_block_list):
    l1, l2, l3 = list1, list2, list3
    next_list = []
    block_list = running_block_list

    for i in range(4):
        l1draw = random.choice(l1)
        l2draw = random.choice(l2)
        l3draw = random.choice(l3)

        next_list.append((l1draw , 'l1'))
        next_list.append((l2draw, 'l2'))
        next_list.append((l3draw, 'l3'))

        l1.remove(l1draw)
        l2.remove(l2draw)
        l3.remove(l3draw)
    
    random.shuffle(next_list)
    for item in next_list:
        block_list.append(item)

    return l1, l2, l3, block_list
    
def build_list_from_blocks(wordfile):
    l1, l2, l3 = chunk_out_words(wordfile)
    random_word_list = []
    for i in range(5):
        l1, l2, l3, random_word_list = build_random_block_from_list(l1,l2,l3,random_word_list)

    return random_word_list


def build_participant_blank(wordfile, researcher_name, participant_id):
    wordlist = build_list_from_blocks(wordfile)
    mytable = []

    for row in range(60):
        myrow = []
        myrow.extend((researcher_name, participant_id, math.floor(row/12) + 1, wordlist[row][0], wordlist[row][1], 0, -1))
        mytable.append(tuple(myrow))

    return mytable

#participanttable = build_participant_table('/Users/vertex/webproject/static/wordlist.csv', 'tim', '121')

#for i in participanttable:
#    print(i)


