import React from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/dist/client/router";
import { format } from "date-fns";
import InfoCard from "../components/InfoCard";
import Map from "../components/Map";

function search({ searchResults }) {
  const router = useRouter();
  const { location, startDate, endDate, numberOfGuests } = router.query;
  const formattedStartDate = format(new Date(startDate), "dd MMMM yy");
  const formattedEndDate = format(new Date(endDate), "dd MMMM yy");
  const range = `${formattedStartDate} - ${formattedEndDate}`;
  console.log(startDate);
  console.log(format(new Date(startDate), "dd MMMM yy"));
  return (
    <div>
      <Header
        placeholder={`${location} | ${range} | ${numberOfGuests} guests`}
      />
      <main className="flex">
        <section className="flex-grow pt-14 px-6">
          <p className="text-xs">
            300+ Stays - {range} - for {numberOfGuests} guests
          </p>

          <h1 className="text-3xl font-semibold mt-2 mb-6">
            Stay in {location}
          </h1>
          <div className="hidden lg:inline-flex space-x-3 mb-5 text-gray-800 whitespace-nowrap  ">
            <p className="button">Cancellation Flexibility</p>
            <p className="button">Type of Place</p>
            <p className="button">Price</p>
            <p className="button">Rooms and Beds</p>
            <p className="button">More Filters</p>
          </div>
          <div className="flex flex-col">
            {searchResults.map((searchResult, idx) => (
              <InfoCard
                key={idx}
                img={searchResult.img}
                title={searchResult.title}
                description={searchResult.description}
                price={searchResult.price}
                star={searchResult.star}
                location={searchResult.location}
                total={searchResult.total}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <section className="hidden lg:inline-flex xl:min-w-[600px]">
        <Map searchResults={searchResults} />
      </section>
    </div>
  );
}

export default search;

export async function getServerSideProps() {
  const searchResults = await fetch("https://links.papareact.com/isz").then(
    (res) => res.json()
  );
  return {
    props: { searchResults },
  };
}
