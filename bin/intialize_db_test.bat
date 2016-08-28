cd ../
set NODE_ENV=test
node bin/command film createTicketTypeGroupsFromJson
node bin/command film createFromJson
node bin/command theater createFromJson
node bin/command theater createScreensFromJson
node bin/command performance createAll
node bin/command reservation reset

node bin/command member createFromJson
node bin/command member createReservationsFromJson
node bin/command sponsor createFromJson
node bin/command staff createFromJson
node bin/command test createTelStaffs
node bin/command test createWindows

node bin/command schema createIndexes

node bin/command film getImages

pause