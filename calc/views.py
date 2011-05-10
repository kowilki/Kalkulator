from pdb import set_trace
from django.shortcuts import render_to_response
from calc.models import Calculator
from django.http import HttpResponse, HttpResponseRedirect

def main_page(request):
    if request.method == "POST": # always create new calculator then, and return redirect
        calc = Calculator.objects.create(user = request.user)
        return HttpResponse(calc.get_url())
    user = request.user
    calculators = user.calculator_set.all()
    return render_to_response('main_page.html', {'calculators': calculators})

def extract_state(post):
    return post.keys()[0]

class Diff_Saver(object):
    diff_extractor = staticmethod(extract_state)
    def __call__(self, calc, post):
        diff = self.diff_extractor(post)
        calc.add_diff(diff)
        return HttpResponse('ok')
save_diff = Diff_Saver()

def calculator(request, calc_id, number = None):
    calc = Calculator.objects.get(id = calc_id)
    if request.method == "POST":
        return save_diff(calc, request.POST)
    state = calc.get_state(number)
    return render_to_response('calc.html', {'calc': calc, 'state': state, 'calc_version': number})

def history(request, calc_id):
    calc = Calculator.objects.get(id = calc_id)
    return render_to_response('history.html', {'calc': calc})

