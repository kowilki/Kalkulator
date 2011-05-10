from pdb import set_trace
from django.db import models
from django.contrib.auth.models import User
from django.contrib import admin
import re

CALC = 0
FIBB = 1
MEDIAN = 2

# Stuff for getting state for given functionality of calculator

class StateGetterException(Exception):
    pass

class Simple_State_Getter(object):
    typecode = None
    def __call__(self, changes):
        changes = [c for c in changes if c.type() == self.typecode]
        if not changes:
            return self.default
        else:
            return changes[-1].get_values()[self.key]
#            return int(changes[-1].change[2:])

class Fibb_SG(Simple_State_Getter):
    " allows get state of Fibbonaci's module on the basis of the list of given changes "
    key = "fibb"
    typecode = FIBB
    default = 1

class Calc_SG(Simple_State_Getter):
    key = "calc"
    typecode = CALC
    default = 0

class Median_SG(object):

                
    class Ret(object):
        "represents state of elements in median compnent"

        def __init__(self):
            self._cont = []
    
        def add_at(self, idx, val):
            idx, val = int(idx), float(val)
            self._cont = self._cont[:idx] + [val,] + self._cont[idx:]
    
        def change_at(self, idx, val):
            idx, val = int(idx), float(val)
            self._cont[idx] = val
    
        def build_container(self):
            return list(self._cont)

        
        
    added = re.compile('^M_A_(?P<idx>\d+)_(?P<val>\d+)')
    changed = re.compile('^M_C_(?P<idx>\d+)_(?P<val>\d+)')


    def __call__(self, changes):
        global MEDIAN

        ret = self.Ret()
        mapping = {
            self.added: ret.add_at,
            self.changed: ret.change_at,
        }

        for change in [c.change for c in changes if c.type() == MEDIAN]:
            for regex, fnct in mapping.iteritems():
                m = regex.match(change)
                if m:
                    fnct(**m.groupdict())
                    break #inner for
    
        return ret.build_container()


class NewMedian_SG(Median_SG):
    def __call__(self, changes):
        global MEDIAN
        ret = self.Ret()
        mapping = {
            'A': ret.add_at,
            'C': ret.change_at,
        }
        for change in [c for c in changes if c.type() == MEDIAN]:
            dct = change.get_values()
            action = dct.pop('action')
            mapping[action](**dct)
        return ret.build_container()
                
                
                
                    
                
            
    
    
# model definitions
    
class Calculator(models.Model):
    user = models.ForeignKey(User)
    created = models.DateTimeField(auto_now_add = True)

    # mapping between name of given calculator functionality, and function available to extract state of given functionality
    # on the basis of list of changes
    # keys in below dictionary are used as keys in dictionary object representing stae, tat object will be passed to template layer
    modules = {   
        "calc": Calc_SG(),
        "median": Median_SG(),
        "fibb": Fibb_SG(),
    }

    def __get_changes_for_state(self, state_number):
        " returns query set containing all changes necessary for construct calculator state with given number "
        changes = self.calc_history_set.all()
        if state_number:
            changes = changes.filter(nr__lte = int(state_number))
        changes = changes.order_by('nr')
        return changes
    
    def get_state(self, state_number):
        " returns dictionary represeting state of all available components in calculator "
        changes = self.__get_changes_for_state(state_number)
        return dict((name, fnct(changes)) for name, fnct in self.modules.iteritems())

    def add_diff(self, diff):
        try:
            change = Calc_History.objects.create(calculation = self, change = diff)
        except Exception, e:
            set_trace()
            print e
            
    
    def get_url(self):
        return "/calc/%s/" % self.id

    def get_changes_url(self):
        return "/history/%s/" % self.id
    
    def __str__(self):
        return "calculator, created on %s" % self.created
        
admin.site.register(Calculator)

# demonstration of metaclasses
class PresenterMeta(type):
    def __new__(cls, name, bases, attribs):
        ret = super(PresenterMeta, cls).__new__(cls, name, bases, attribs)
        if hasattr(ret, '_type_map'):
            ret._type_map = dict( (key, staticmethod(val)) for key, val in ret._type_map.iteritems())# change all methods
        return ret
        
# helper class, allows presenting other Change_History objects
class ChangePresenter(object):
    def _present_calc(self, change):
        dct = change.get_values()
        return "new  value in calculator results: %s" % dct['calc']
    def _present_fibb(self, change):
        dct = change.get_values()
        return "new Fibbonaci number requested. It's index was: %s" % dct['fibb']
    def _present_median(self, change):
        dct = change.get_values()
        if dct['action'] == 'A':
            return "new value: %s inserted at new index: %s" % (dct['value'], dct['idx'])
        elif dct['action'] == 'C':
            return "changed value at position: %s to new value: %s" % (dct['idx'], dct['value'])
        
    def present(self, change):
        _type_map = {
            CALC : self._present_calc,
            FIBB: self._present_fibb,
            MEDIAN: self._present_median,
        }
        # good practice DEMONSTRATION - in this case, I wonder if using list for concatenating makes it much faster, 
        # because of amount of concatenated strings
        ret = []
        ret.append(_type_map[change.type()](change))
        ret.append("change made on: %s" % change.created)
        return '; '.join(ret)

class Calc_History(models.Model):
    calculation = models.ForeignKey('calc.Calculator')
    created = models.DateTimeField(auto_now_add = True)
    change = models.TextField(max_length = 30)

    # in production version, it should be checked if id is mapped to ascending sequence in database
    nr = models.AutoField(primary_key = True)

    presenter = ChangePresenter()

    def __str__(self): 
        if hasattr(self, 'presenter'):
            return self.presenter.present(self)
        return models.Model.__str__(self)
        
    __repr__ = __str__

    _type_regex = {
        CALC: re.compile("^C"),
        FIBB: re.compile("^F"),
        MEDIAN: re.compile("^M"),
    }

    def type(self):
        " returns type code of given change item"
        for typename, regex in self._type_regex.iteritems():
            if regex.match(self.change):
                return typename
        raise Exception("bad entry in database")

    def get_values(self):
        """ returns dictionary representing this change """
        global CALC, FIBB, MEDIAN
        if self.type() == CALC:
            return {"calc": int(self.change[2:])}
        elif self.type() == FIBB:
            return {"fibb": int(self.change[2:])}
        elif self.type() == MEDIAN:
            ret = {'action': self.change[2]}
            try:
                idx, val = map(int, self.change[4:].split('_'))
                ret.update({'idx': idx, 'value': val})
            except:
                idx = int(self.change[4:])
                ret.update({'idx': idx})
            return ret

    def get_url(self):
        return self.calculation.get_url() + str(self.nr)

admin.site.register(Calc_History)
    
    



