// This is frontend code for running a metamemory experiment
// I am not a javascript programmer, so it is HIGHLY suboptimal.

// A full refactor would be advisable before using this for anything sensitive.
//---------------------------------------------------------------///

//binds for new session submission button

var block_wordlist
var current_block
var block_betlist = []
var block_wordsrecalled = []
var block_score
var trial_number = 0

var trials_in_block = 11

var total_blocks = 5

var prestimulus_delay = 500//1000
var poststimulus_delay = 500 //3000
var stimulus_duration = 3000 //500

var theQueue = $({});

var tutQueue = $({});

//note: way of defining global variables -- just don't use 'var' when you assign them
var bind_session_variables = function() {
   participant = $('input[name="participant_id"]').val();
   demomode = $('#demonstration').is(':checked');
   current_block = 1
   get_block_wordlist(dummy);
   
}

var bind_setup_form = (function() {
    $('a#start-session-button').bind('click', function() {

      $.getJSON('/begin_session', {
        researcher: $('input[name="researcher"]').val(),
        participant: $('input[name="participant_id"]').val(),
        demomode: $('#demonstration').is(':checked')
      }, function(data) {
        console.log("data" + data)
        if (data == true) {
        // what follows is a test function for database queries.
        // it depends on begin session sending back a word list (also a test function)
        //$("#start-session-button").text(data.result);

        //load up 'tutorial' screen
        bind_session_variables();
        $("#main-div").load('/tutorial', function() {
          tutorial_listener();

        });
      } else {
        console.log('i think data != "true"')
        alert('that participant ID has already been used, please choose another')
      }

      });



      return false;
    });
  });


///// THIS IS THE TUTORIAL LOGIC ////

var tutorial_listener = function() {
  $('.instructions-text').first().removeClass('hidden')
  $('.instructions-text').each(function(index) {
    if (index <= $('#tutorial-pane').length) {
      console.log("THIS is: " + $( this ).attr('id') + index + $('#tutorial-pane').size());

      var hidepanel = '#' + $( this ).attr('id');
      var showpanel = '#' + $( this ).next().attr('id');

      tutQueue.queue('tutorial_queue', function() {go_next_listener(hidepanel,showpanel)});
      console.log("i added something to queue: " + $( this ).attr('id'));
    }
    else {
      console.log("it's over annakin")
      tutQueue.queue('tutorial_queue', function() {end_tutorial_listener()});
    } 

  // tutQueue.queue('tutorial_queue', function() {end_tutorial_listener()});
   


  }
  );
  tutQueue.dequeue('tutorial_queue');
}


var go_next_listener = function(hidepanel, showpanel) {
  console.log('listener got dequeued, hidepand showpanel ==' + hidepanel + showpanel)
  setTimeout(function() {
  $(document).on('keypress', function(keyEvent) {
      if(keyEvent.keyCode == 13){
        $(hidepanel).addClass('hidden');
        $(showpanel).removeClass('hidden');
        tutQueue.dequeue('tutorial_queue');
        $(document).off('keypress')
        }
  });

  }, 1000)
}

var end_tutorial_listener = function() {
  console.log('listener got dequeued, ready to end')
  setTimeout(function() {
  $(document).on('keypress', function(keyEvent) {
      if(keyEvent.keyCode == 13){
        $(document).on('keypress');
        $('#main-div').load('/test_loop', function() {
        run_test_session();
        console.log('ran test cycle');
        $(document).off('keypress')
      });
        }
  });

  }, 1000)
}

var dummy = function() {
  dummy = 1
}

///// END TUTORIAL LOGIC /////

var export_button = function() {
  $("a#export-to-dropbox").bind('click', function(){
    console.log('i know i got clicked')
    $.getJSON('/save_database', {}, function(data){
      console.log('saving database: ' + data)
    })
  })
}

var proof_of_life = function() {
  $("#start-session-button").text('begin experiment')
}

//this should be done with a callback.
var bind_ready_button = function() {
  $(document).on('mouseover mouseout', 'body', function(){
    $('a#ready-button').bind('click', function() {
      $('#main-div').load('/test_loop', function() {
        run_test_session();
        console.log('ran test cycle');
      });
      
      
    })
  })
}

// this should need to resolve before we continue.
// maybe as a callback for run_when_permitted?
// learn javascript and refactor all of this please.
var get_block_wordlist = function(mycallback) {
  console.log('running get_block_wordlist');
  console.log("current block" + current_block);
  console.log('current block' + current_block);
  $.getJSON('/return_block_wordlist', {

    block: current_block,
    participant: participant
  },
  function(data) {
    block_wordlist = data
    console.log("data" + data)
    mycallback();
  }
  );
}



var flash_word = function() {
  console.log('running flash_word');
  setTimeout(function () {
    show_word();
    hide_word_after_delay();
    }, prestimulus_delay);
}
var show_word = function() {
  $("#word-screen").removeClass("hidden");
}

var hide_word_after_delay = function() {
    setTimeout(function () {
    $("#word-screen").addClass("hidden");
    show_bet_screen();
    }, stimulus_duration);
  }

var set_word_by_number = function(trial_number) {
  $('#stimulus').text(block_wordlist[trial_number]);
  console.log("set_word_by_number thinks the wordlist is " + block_wordlist)
}

var show_bet_screen = function() {
  setTimeout(function () {
    $("#bet-screen").removeClass("hidden");
    $('#bet-field').focus().val('').attr({
       "max" : 10,        // substitute your own
       "min" : 0          // values (or variables) here (should not set this every time show runs)
    });

  }, poststimulus_delay)
  
}

var hide_bet_screen = function() {
    $("#bet-screen").addClass("hidden");  
}



//this is comically ugly. permission, really? no clue what is happening here.
var run_when_permitted = function(mypermission) {
  console.log('running run_when_permitted');
  for (i = 0; i < trials_in_block; i++) {
        theQueue.queue('trials_queue', function() {run_test_cycle(trial_number, mypermission)});
        console.log(mypermission.state());
     
  };
        console.log('we are done');
        theQueue.queue('trials_queue', function() {go_to_recall_phase();})
  }
var run_test_session = function() {
  console.log('running run_test_session');
  var mypermission = $.Deferred()
  mypermission.resolve()

  run_when_permitted(mypermission);
  run_test_cycle(trial_number, mypermission);

}

var run_test_cycle = function(trial_number, mypermission) {
  console.log('running run_test_cycle');
  hide_bet_screen();
  console.log("run_test_cycle thinks the wordlist is " + block_wordlist)
  set_word_by_number(trial_number);
  flash_word();
  my_bet_adder(mypermission)

}


var my_bet_adder = function(mypermission) {
  console.log('running my_bet_adder');
  $(document).off('submit');
  $(document).on('submit',"#bet-form",function(e){
      e.preventDefault();
    //do something

  //$('#bet-form').submit(function() {

      if ($('#bet-field').val() !== '') {
        //$(document).off('submit');
        console.log("my_bet_adder thinks the wordlist is " + block_wordlist)
        block_betlist.push(block_wordlist[trial_number] + ',' + $('#bet-field').val());

        //trial_number = trial_number + 1
        //run_test_cycle(trial_number)
        console.log("block betlist" + block_betlist)
        trial_number = trial_number + 1

        mypermission.resolve();
        theQueue.dequeue('trials_queue')
        console.log("theQueue" + theQueue)

        }
      });
 // };
  }; 

var go_to_recall_phase = function () {
  $("#main-div").load('/recall_phase', function() {
    recall_phase_logic();
  })
}


/// RECALL PHASE CODE HERE ///

var recall_phase_logic = function() {
  console.log('running recall_phase_logic');
  enterlistener();
  $('#recall-finished-button').click(function() {
    console.log("i got clicked")
    show_score();
    return;
  }
  )
    $('#recall-field').focus();
    $('form').submit(function() {
        if ($('.input').val() !== '') {
            block_wordsrecalled.push($('.input').val())
            var newTask = $('.input').val();
            var newLi = $('<li>' + newTask + '</li>');
            // newLi.on('click', function() {
            //     $(this).remove(); // Attach the event handler *before* adding the element
            // });
            $('ul').append(newLi); // To put the new task at the bottom of the list
            $('#recall-field').val('').focus();
            return false; // So the change persists
        }
    });
    
};

var calculate_block_score = function() {
  $.getJSON('/score_calc', {
    participant: participant,
    block: current_block,
    recalllist: JSON.stringify(block_wordsrecalled),
    betlist: JSON.stringify(block_betlist)
  },
  function(data) {
    console.log("data in cbs" + data)
    block_score = data
    $('#score-field').text(block_score);
  })
}

// submit answers when number key 6 is pressed.
var enterlistener = function(deferred) {
$(document).on('keypress', function(e) {
  if(e.which == 54) {
    // enter pressed
    // now execute:
    ////////$('#main-div').load('/');
    $(document).off('keypress')
    console.log("data in enterlistener" + block_wordsrecalled)
    show_score();
    return;
  }
});

};


///// SCORE SCREEN LOGIC //////

var show_score = function() {
  $(document).off('keypress')
  $("#main-div").load('/score_screen', function() {
    console.log('showscore says what?')
    console.log('showscore says what?' + block_score)
    calculate_block_score();
    wait_to_continue();
    
})
}

var wait_to_continue = function() {
  setTimeout(function() {
      next_block_listener()},1000);
  }


var next_block_listener = function(deferred) {
console.log('running next_block_listener');
$(document).on('keypress', function(e) {
  if(e.which == 13) {
    $(document).off('keypress')
    // enter pressed
    // now execute:

    if (current_block < total_blocks) {
      current_block = current_block + 1
      prepare_block_variables(enter_next_session);
      console.log('nextblocklistener: trying to continue')

      

      return;
  } else {
      console.log('nextblocklistener: trying to end')
      $('#main-div').load('/thank_you');
      
  }
  }
});
};

var enter_next_session = function() {

  $('#main-div').load('/test_loop', function() {
        run_test_session();
        console.log('ran test cycle');
        })
}

var prepare_block_variables = function(mycallback) {
  console.log('running prepare_block_variables');
  get_block_wordlist(mycallback);
  block_betlist = []
  block_wordsrecalled = []
  trial_number = 0
}

$(document).ready(function() {
   bind_setup_form();
   proof_of_life();
   export_button();
   bind_ready_button();  
   // bind_test_cycle_startup();

});
