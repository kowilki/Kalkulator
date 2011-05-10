
// helper object
var helper = {
    // makes shallow copy of given object
    sh_clone: function(dct){
        var ret = {};
        for(key in dct){
            ret[key] = dct[key];
        }
        return ret;
    },
    // returns new array filled with given instance of arguments object
    arguments_to_array: function(arg){
        var ret = new Array(arg.length);
        for(var i=0;i<arg.length;i++){
            ret[i] = arg[i];
        }
        return ret;
    },
    
    // returns float on the basis of given string value
    parse_double: function(val){
        return parseFloat(val);
    },

    // returns integer value on the basis of given string value
    parse_int: function(val){
        return parseInt(val, 10);
    },

    // indicates error to the user, throws exception
    // @param val: text printed to the user
    // this method should work and be well tested, because it rarely be called in try-catch block
    error: function(val){
        try{
            var text = [];
            var ue = 'unexpected error';
            if(!val){
                val = ue;
            }

            if(typeof val === "object"){
                try{
                    text.push(val['text']);
                } catch(e){
                    text.push(ue);
                }
            } else {
                try{
                    text.push(val.toString());
                } catch (e){
                    text.push(ue);
                }
            }
            alert(text.join(' '));
        }catch(e){
            alert("unexpected error"); 
        }
    },

    // logs infromations, used mainly during development
    log: function(val){
        var $log = $("#log");
        try{
            $log.append(val.toString());
        } catch(e){
            $log.append("Error during logging: " + e.toString());
        } finally {
            $log.append("<br/>");
        }
    },
};
