flowchart TD
    Start[Start App]
    Start --> Splash[Splash Screen]
    Splash --> AuthCheck{User Authenticated}
    AuthCheck -- Yes --> Home[Home Screen]
    AuthCheck -- No --> AuthFlow[Authentication Flow]
    AuthFlow --> Login[Login Screen]
    AuthFlow --> Register[Register Screen]
    Login --> LoginSuccess{Success}
    Register --> RegSuccess{Success}
    LoginSuccess -- Yes --> Home
    LoginSuccess -- No --> Login
    RegSuccess -- Yes --> Home
    RegSuccess -- No --> Register
    Home --> ViewTree[View Family Tree]
    ViewTree --> TreeScreen[Family Tree Screen]
    TreeScreen --> SelectMember[Select Member]
    SelectMember --> MemberDetails[Member Details Screen]
    MemberDetails -- Edit --> EditMember[Edit Member Screen]
    MemberDetails -- Add --> AddMember[Add Member Screen]
    EditMember --> SaveEdit[Save Changes]
    AddMember --> SaveAdd[Submit New Member]
    SaveEdit --> UpdateResult{Operation Success}
    SaveAdd --> UpdateResult
    UpdateResult -- Yes --> TreeScreen
    UpdateResult -- No --> Error[Show Error]
    Error --> TreeScreen