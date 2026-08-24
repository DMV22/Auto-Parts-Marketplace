# Frontend contract fixtures

- Назва response fixture має формат `<state><Domain>ResponseFixture`.
- Окрему safe projection позначає суфікс `ProjectionFixture`.
- Fixtures описують literal JSON на публічній API seam і не імпортують implementation code.
- Domain-specific factories додаються лише коли тест потребує варіативних полів; їхня назва має формат `create<Domain>Fixture`.
- MSW handlers можуть жити в spec, але мають повертати fixtures із цього каталогу замість дубльованих DTO objects.
