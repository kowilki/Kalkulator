// author: Marek Wawrzyczek
//
// note: in comments bellow, term "control" is used to describe html DOM elements that have graphical representation in web browsers


var CalcGui = function(){
    this.calc = undefined; //reference to calculator

    // references to controls performign operations
    // references o groups of controls that perform simple 2 argument calculator operations (+, -, *, /)
    this.$btn_add = $("#btn_add");
    this.$btn_sub = $("#btn_sub");
    this.$btn_mul = $("#btn_mul");
    this.$btn_div = $("#btn_div");

    this.$btn_fibb_caculate = $("#btn_fibb_calculate");// index of Fibbonaci nubmer to calculate

    this.$btn_median_add_at_beginning = $("#btn_add_number_to_median");

    // references to controls storing parameters of performed actions
    this.$txt_user_input_calc = $("#txtUserInput");// reference to calculator's user input
    this.$fibb_number = $("#fibb_number");// stores value of requested Fibbonaci number
    this.$median_container= $("#median_container"); // container of all elements of set whose median is to be calculated
    this.$median_new_number_value = $("#median_new_number_value"); // container of a value of number that will be added after clicking "add new value below"

    // references to resutl controls
    this.$calc_result = $("#calc_result");
    this.$fibb_result = $("#fibb_result");
    this.$median_result = $("#median_result");
    
    
    // returns value that user entered in calculator input
    this.get_user_input_val = function(){
        return this.$txt_user_input_calc.val();
    };

    this.init = function(calc){
        this.calc = calc;

        // configure standard operations
        var pf = function(gui, op_type){
            return function(){// here gui, op_type and calc are taken from clousure scope
                var val = helper.parse_double(gui.get_user_input_val());
                calc.perform_action(op_type, val);
            };
        };
        this.$btn_add.click(pf(this, "+"));
        this.$btn_sub.click(pf(this,"-"));
        this.$btn_mul.click(pf(this,"*"));
        this.$btn_div.click(pf(this,"/"));
        
    
        // configure controls related to calculate fibbonaci number
        this.$btn_fibb_caculate.click((function(gui){
            return function(){
                var val = helper.parse_int(gui.$fibb_number.val());
                calc.perform_action("calc_fibb", val);
            };
        })(this));

        // configure contrlos related to  median calculation
        this.$btn_median_add_at_beginning.click((function(gui){
            return function(){
                try{
                var $obj = gui.create_median_obj()
                $obj.data("set_value")(gui.get_new_median_element_value());
                gui.$median_container.prepend($obj);
                gui.median_value_changed($obj, "added");
                } catch (e){
                    helper.error(e);
                }
            }
        })(this));
    };

    
    // called when somethign with value inside div that contains value of set for which median is calculated changed
    // it includes adding new div (then value is added), changing value, removing div(then value is removed too)
    //
    // the algorithm of informing Calculator is as follows:
    //      1. get number of div whose value has changed
    //      2. send informations about change to controller
    //      
    // after the point (2), the Controlled should call set_state, so that gui can redraw itself
    //
    // @param $div: container of the input representing set's value
    // @param action: enumeration, should be one of the following: "added", "deleted", "changed"
    this.median_value_changed = function($div, action){
        var calculate_child_no = function($cont){
            var searched = $cont.get(0);
            var $children = this.$median_container.children();
            for(var i=0;i<$children.length;i++){
                var $child = $children[i];
                if(searched == $child){
                    return i;
                }
            }
        }
       
        var idx = calculate_child_no.call(this, $div);
        var val = $div.data("value")();
        this.calc.perform_action("manage_median", val, action, idx);
    };

    this.get_new_median_element_value = function(){
        try{
            var ret = this.$median_new_number_value.val();
            if(isNaN(ret) || !ret)throw "given value is not a number";
            return ret;
        }catch(e){
            throw {'component': 'median', 'text': "Median counting: " + e.toString()};
        }
    };
    

    // returns jQuery object represening one element of set for which median should be calculated
    // 
    // description of cunctions accessible via jQuery's wrapper to returned object (accessed via $wrapperInstance.data(method_name) ):
    //      value - returns float representing value stored in current container
    //      append_new - adds new value container after the current container
    //      get_input - returns jQuery wrapper for control cotnainng text representing number of a set
    //      set_value - sets 
    this.create_median_obj  = function(){
        var $ret = $('<div class="median_value_container"><input type="text" value="0"/><button>add new value below</button></div>');

        $ret.data("value", (function($cont){ 
            return function(){
                var $text_field = $cont.data("get_input")();
                var val = $text_field.val();
                return helper.parse_double(val);
            };
        })($ret)).data("set_value", (function($ret){
            return function(new_val){
                $ret.data("get_input")().val(new_val);
            };
        })($ret)).data("appendNew", (function($ret, gui){
            return function(){
                    var $new_cont = gui.create_median_obj();
                    $new_cont.insertAfter($ret); 
                try{
                    $new_cont.data("set_value")(gui.get_new_median_element_value());
                    gui.median_value_changed($new_cont, "added");
                }catch(e){
                    $new_cont.remove();
                    helper.error(e);
                }
            };
        })($ret, this)).data("get_input", (function($ret){
                return function(){
                    return $($ret.find("input")[0]);
                };
            })($ret));

        $ret.find("button").click(function(){ $ret.data("appendNew")(); });

        $ret.find("input").change((function(gui){
            return function(){
                gui.median_value_changed($($(this).parent()[0]), "changed");
            }
        })(this));


        return $ret;
    };
    
    // sets gui's state, performs redrawing of controls that should be redrawed
    this.set_state = function(new_gui_state){ // can be called "redraw"
        // Simple calculator
        this.$calc_result.text(new_gui_state.ACC);
    
        // Median
        this.$median_result.text(new_gui_state.MEDIAN_VALUE);
        if(new_gui_state.force_redraw_median){// draw median elements
            var elements = new_gui_state.median_list;
            for(var i=0;i<elements.length;++i){
                var $obj = this.create_median_obj()
                $obj.data("set_value")(elements[i]);
                this.$median_container.append($obj);
            }
            
        }

        // Fibbonacci
        var fib_text = "";
        if(new_gui_state.FIBB_ACC == Number.POSITIVE_INFINITY){
            fib_text = "unforutnatelly, this software doesn't allow to calculate so high Fibbonacci number";
        } else {
            fib_text = new_gui_state.FIBB_ACC;
        }
        this.$fibb_number.val(new_gui_state.FIBB_REQUIRED);
        this.$fibb_result.text(fib_text);
    };
};

/* Since gui needs only values of accumulators and values of */
var GuiState = function(CALC_ACC, FIBB_ACC){
    this.CALC_ACC = ACC;
    this.FIBB_ACC = FIBB_ACC;
};


var CalcState = function(accumulators, last_operation, median_info){
    this.accumulators = helper.sh_clone(accumulators);
    this.last_operation = last_operation;
    this.median_info = median_info;
    return true;
};

var MedianCounter = function(){
    this.__median_index = undefined;
    this.__array = [];

    this.odd = function(){
        return this.__array.length % 2;
    };
    
    this.get_state = function(){
        return {
            array: this.__array ? this.__array.slice(0) : undefined,
            __median_index: this.__median_index,
        };
    };

    this.set_state = function(array, median_index){
        this.__array = array;
        this.__median_index = median_index;
    };

    this.get_val = function(){
        if(this.__array.length == 0){
            return "can't calculate median of empty set";
        }
        if(!this.__median_index){
            this.__median_index = Math.floor((this.__array.length - 1) / 2);
        }
        if(this.odd()){
            return  this.__array[this.__median_index];
        } else {
/*            if (this.__array.length == 0){
                helper.error("there are no elements in the set, so can't calculate median of them.");
            }*/
            var mid_lo = this.__array[this.__median_index];
            var mid_hi = this.__array[this.__median_index + 1];
            return (mid_lo + mid_hi) / 2;
        }
    };


    
    // arguments:
    //          number's value
    //          action - type of action performed in given value
    //          idx - index of element in the array
    // returns: 
    //          string representation of state change
    this.update = function(action_type, idx, value){
        if(isNaN(value)){
            throw "given value is not number";
        }
        var ret = "";
        if(action_type === "added"){
            var new_arr = this.__array.slice(0, idx);
            new_arr.push(value);
            new_arr.push.apply(new_arr, this.__array.slice(idx));
            this.__array = new_arr;
            ret =  "A_" + idx.toString() + "_" + value.toString();
        } else if (action_type === "removed") {
            var new_arr = this.__array.slice(0, idx);
            new_arr.push.apply(new_arr, this.__array.slice(idx + 1));
            ret = "R_" + idx.toString();
        } else if (action_type === "changed") {
            this.__array[idx] = value;
            ret = "C_" + idx.toString() + "_" + value.toString();
        } else throw "bad parameter passed to MedianCounter.update";

        // force recounting median
        this.__median_index = undefined;
        this.get_val();

        return ret;
    };
};

var FibbonaciCounter = function(){
    this.__cache = [0, 1];
    this._do_get_val = function(n){
        if(isNaN(n)){
            throw "given argument is not a number";
        }
        // order of two instructions belwo
        if(n<1){
            throw "trying to get fibbonaci sequence number with index which is smaller than 1";
        }
        n--; // because arrays in js are zero-index based

        if(n > this.__cache.length - 1){ // if searched value isn't in cache - fill cache with proper values
            var last_n = this.__cache.length;
            var c = this.__cache; // for simplicyty, store reference to this.__cache to avoid writing this.__cache all the time ....
            do{
                var new_val = c[last_n] = c[last_n - 1] + c[last_n - 2];
                if(new_val == Number.POSITIVE_INFINITY){// break if number is infinity
                    return Number.POSITIVE_INFINITY;
                }
            }while(last_n++ < n);
        }
        return this.__cache[n];
    };
    
    // returns value of n'th Fibbonaci number
    this.get_val = function(n){
        try{
            return this._do_get_val(n);
        }catch(e){
            // quick hack due to lack of time
            throw {"text": "bad index requested for Fibbonaci number" + e.toString(), "component": "fibb"};
        }
    };
    
    // TODO: make get_state return immutable object
    this.get_state = function(){
        return {
            cache: this.__cache.slice(0),
        };
    };
    
/*    this.set_state = function(state){
        this.__cache = state.cache.slice(0);
    };*/
};


var Calculator = function(){
    this.ACC =  0;
    this.FIBB_REQUIRED = undefined;
    this.FIBB_ACC = undefined;

    this.median = new MedianCounter(undefined, []);
    this.fib = new FibbonaciCounter();
    this.gui = new CalcGui();
    this.state_manager = new StateManager();

    this.init = function(){
        // init gui
        this.gui.init(this);
    };

    this.get_state = function(){
        return {
            ACC: this.ACC,
            FIBB_REQUIRED: this.FIBB_REQUIRED,
            FIBB_ACC: this.fib.get_val(this.FIBB_REQUIRED),
            CALC_ACC: this.ACC,
            MEDIAN_VALUE: this.median.get_val(),
//            median: this.median.get_state(),
//            fib: this.fib.get_state(),
        };
    };

    var simple_calc_function = function(fnct, calc_ref){
        return function(val){
            try{
                if(isNaN(val)){
                    throw "given argument is not nubmer";
                }
                fnct.call(calc_ref, val);
                return "C_" + calc_ref.ACC.toString();
            }catch(e){
                throw {'component': 'calc', 'text': e.toString()};
            }
        }
    };

    // all functions defined below assume that paremeters are converted properly (e.g. when there's int required, then there's int)
    this.actions = {
        '+': simple_calc_function(function(val){ this.ACC += val;}, this),
        '-': simple_calc_function(function(val){ this.ACC -= val;}, this),
        '*': simple_calc_function(function(val){ this.ACC *= val;}, this),
        '/': simple_calc_function(function(val){
                if(val==0){
                    helper.error('trying to divide by 0');
                }
                this.ACC /= val;
            }, this),
        'manage_median': function(val, action, idx){
            // arguments:
            //          number's value
            //          action - type of action performed in given value
            //          idx - index of element in the array
            // this method simply calls median's update method
            var ret = "M_"
            ret += this.median.update(action, idx, val);
            return ret;
        },
        'calc_fibb': function(n){ 
            this.FIBB_REQUIRED = n;
            this.FIBB_ACC = this.fib.get_val(n);
            return "F_" + n.toString();
        },
    };

    this.reset_fibb = function(){
        this.FIBB_ACC = 0;
        this.FIBB_REQUIRED = 1;
    };
    this.reset_calc = function(){
        this.ACC = 0;
    };
    this.reset_median = function(){
    };

    // @param action_type: defines type of action to be taken
    // additional arguments (seen as arguments) - parameters necessary for completing given operation (e.g. parts of sum, 
    //
    this.perform_action = function(action_type){
        var error_before_ajax = false, new_state = undefined, last_state = undefined, diff = '';
        // below two try-catch blocks are used, because enable_disabled must be called when caught error before sending ajax, 
        // because when exception is thrown before ajax call, then enable_disabled won't be called since it's called in both 
        // ajax callback and ajax errorback 
        // enable_disabled can't be called in finally block too, because it's genrally used to prevent user from launching 
        // action of sending message to server, when there already have been message sent, and browser is waiting for 
        // response from server
        try{
            disable_all();
            last_state = this.get_state();// get actual state, it is to pass to save_state method;

            var args_to_pass = helper.arguments_to_array(arguments).slice(1);

            // if below diff is instantiated to something (not undefined) then that value is used as diff between states
            diff = this.actions[action_type].apply(this, args_to_pass);
        
            new_state = this.get_state();
        }
        catch(e){
            enable_disabled(); // must be called, because no ajax callback will be called to call enable_disabled
            if(typeof e === 'object'){
                try{
                    // don't know why jsut try-catch block doesn't manage restoring state of FibbonaciCounter
                    var mapping = {
                        'fibb': this.reset_fibb,
                        'calc': this.reset_calc,
                        'median': this.reset_median,
                    };
                    var component = e['component'];
                    mapping[component]();
                }catch(e){
                    ;// probably will be in inconsistent state here
                }
            }
            error_before_ajax = true;
            helper.error(e);
        }

        if(!error_before_ajax)
        {
            try{
                this.save_state(new_state, last_state, diff);
                this.gui.set_state(new_state);
            }catch(e){
                helper.error(e);
            }
        }
    };
    

    // saves calculator's state to db
    // @param new_state: state to be saved, 
    // @param last_state: state of caclulator which was before new_state was the actual state, used to make difference of states which will be sent to db
    // @param diff
    this.save_state = function(new_state, last_state, diff){
        helper.log(diff);
        this.state_manager.save_diff(diff);
        if(!diff){
            throw "this calculato implementation doesn't implement calculating state difference on the basis of two states";
        }
    };
    
        
    // creates new state of gui
    // @param new_state: new state of calculator
    // @param: last_state: last state of calculator, used so that gui would update only necessary controls
    this.create_gui_state = function(new_state, last_state){
    };

    this.set_state = function(state){
        this.median.set_state(state["median"]);
        this.FIBB_REQUIRED = state["fibb"];
        this.ACC = state['calc'];

        var new_state = this.get_state();
        new_state.force_redraw_median = true;
        new_state.median_list = state["median"];

        this.gui.set_state(new_state);
    };

    return true;
};

var StateManager = function(){
    this.url = "/calc/" + calc_id.toString() + '/'; 
    this.connection= get_connection();
    this.save_diff = function(diff){
        this.connection.send(this.url, diff, "POST", function(){
            enable_disabled();
            helper.log('sent properly!');
        }, function(a,b,c){alert(b);});
    }
}


// responsible for managing connections with the server
// implemented as singleton
// ensures that there will be made at most one ajax call at the time
// because some browsers can't handle more than two ajax calls at the same time
var get_connection = function(){
    var ConnectionImpl = function(){
        this._is_enabled = false;
        this.disable = function(){ this._is_enabled = false; };
        this.enable = function(){ this._is_enabled = true; };
            
        this._send_lock = false;

        this.fnct_wrapper = function(f, conn){
            return function(data, textStatus, jqXHR){
                f && f.apply(arguments);
                conn._send_lock = false;
            };
        };

        this.err_wrapper = function(f, conn){
            return function(data, status, jqXHR){
                if(status === "timeout"){
                    helper.error("the server didn't response in proper time, contact site administrator");
                }
                f && f.apply(arguments);
                conn._send_lock = false;
            };
        };

        this.send = function(where, what, method, callback, errCallback){
            if(!this._is_enabled)return;
            if(this._send_lock){
                throw "can't send data now, lock set"
            }
            this._send_lock = true;
            

            callback = this.fnct_wrapper(callback, this);
            errCallback = this.err_wrapper(errCallback, this);

            $.ajax({
                url: where,
                data: what,
                type: method,
                success: callback,
                error: errCallback,
            });
        }
        return true;
    }

    connection = new ConnectionImpl();
// below code may be used so that there would not be need to call get_connecion, but simply new Connection() and that 
// will also return singleton instance (I think)
/*    var Connection = function(){
        return connection;
    }*/
    get_connection = function(){
        return connection;
    };
    return get_connection();
}

var shows_archived_version = function(){
    var loc = window.location.toString();
    var idx = loc.search("\\d+/\\d+");
    return idx > -1;
}

var disable_all = function(){
    $("button, input").attr('disabled', true);
}
var enable_disabled = function(){
    $("button, input").attr('disabled', false);
}
$(document).ready(function(){
    var calc = new Calculator();
    get_connection().disable();
    calc.set_state(state);
    calc.init();
    get_connection().enable();

    if(shows_archived_version()){
        $(document.body).prepend($("<h2>in this mode you can not perform any operations</h2>"));
        disable_all();
        enable_disabled = function(){};//disalow enabling TODO: refactor :) 
    }
});
