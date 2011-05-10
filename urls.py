from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^$', 'django.contrib.auth.views.login'),
    (r'^main_page/?$', 'calc.views.main_page'),
    (r'^calc/(?P<calc_id>\d+)/(?P<number>\d+)/$', 'calc.views.calculator'),
    (r'^calc/(?P<calc_id>\d+)/$', 'calc.views.calculator'),
    (r'^history/(?P<calc_id>\d+)/', 'calc.views.history'),

     (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    (r'^admin/', include(admin.site.urls)),
    (r'^site_media/(?P<path>.*)$', 'django.views.static.serve',
        {'document_root': settings.STATIC_FILES_DIR}),

)
