from django.urls import path
from .views import (
    CaseListCreateView, CaseDetailUpdateView,
    SupervisorCaseOverview, CaseLogListView,
    ChainOfCustodyView, ChainVerifyView,
    CaseHandoverView, CaseHandoverHistoryView,
    CaseOfficersListView,
    CaseProgressView, CaseProgressCheckView,
)
from .dashboard_views import (
    DashboardKPIView, DashboardBySeverityView,
    DashboardTimelineView, DashboardRecentCasesView,
)

urlpatterns = [
    # Cases
    path("cases/",                               CaseListCreateView.as_view()),
    path("cases/<uuid:pk>/",                     CaseDetailUpdateView.as_view()),
    path("cases/<uuid:pk>/handover/",            CaseHandoverView.as_view()),
    path("cases/<uuid:pk>/handovers/",           CaseHandoverHistoryView.as_view()),
    path("cases/<uuid:pk>/custody/",             ChainOfCustodyView.as_view()),
    path("cases/<uuid:pk>/chain-verify/",        ChainVerifyView.as_view()),

    # Progress updation (from requirements doc)
    path("cases/<uuid:pk>/progress/",            CaseProgressView.as_view()),
    path("progress/<int:pk>/complete/",          CaseProgressCheckView.as_view()),

    # Lists
    path("supervisor/overview/",                 SupervisorCaseOverview.as_view()),
    path("case-logs/",                           CaseLogListView.as_view()),
    path("officers/",                            CaseOfficersListView.as_view()),

    # Dashboard
    path("dashboard/kpi/",                       DashboardKPIView.as_view()),
    path("dashboard/by-severity/",               DashboardBySeverityView.as_view()),
    path("dashboard/timeline/",                  DashboardTimelineView.as_view()),
    path("dashboard/recent-cases/",              DashboardRecentCasesView.as_view()),
]
